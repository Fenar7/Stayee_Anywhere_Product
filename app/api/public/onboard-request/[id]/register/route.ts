import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  handleApiError,
  ValidationError,
  NotFoundError,
  ConflictError,
} from "@/lib/errors";
import { createAdminClient } from "@/lib/auth/server";
import { verifyAndGetFileType, compressImage } from "@/lib/image";
import { uploadToStorage } from "@/lib/storage";
import {
  OnboardingRequestStatus,
  StayStatus,
  UserRole,
  OccupationType,
  DocumentOwnerType,
  DocumentType,
} from "@prisma/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

import { registrationSchema } from "@/lib/validation/tenant";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;

    // 1. Fetch and validate OnboardingRequest
    const onboardingRequest = await prisma.onboardingRequest.findUnique({
      where: { id: requestId },
      include: {
        hostel: { select: { organizationId: true } }
      }
    });

    if (!onboardingRequest) {
      throw new NotFoundError("Onboarding request not found");
    }

    if (onboardingRequest.status !== OnboardingRequestStatus.PENDING) {
      throw new ConflictError("This onboarding link is no longer active or already completed");
    }

    const { phone } = onboardingRequest;

    // 2. Parse FormData
    const formData = await request.formData();

    // Reconstruct input fields for validation
    const inputFields: Record<string, unknown> = {};
    for (const key of Object.keys(registrationSchema.shape)) {
      const val = formData.get(key);
      if (val !== null) {
        inputFields[key] = val === "null" || val === "undefined" ? null : val;
      }
    }

    const parsedData = registrationSchema.safeParse(inputFields);
    if (!parsedData.success) {
      throw new ValidationError(
        parsedData.error.issues[0]?.message ?? "Invalid form fields"
      );
    }
    const data = parsedData.data;

    // 3. File validation (Profile Photo and ID Document)
    const photoFile = formData.get("photo") as File | null;
    if (!photoFile || typeof photoFile === "string" || typeof photoFile.arrayBuffer !== "function") {
      throw new ValidationError("Profile photo is required");
    }

    const idDocumentFile = formData.get("idDocument") as File | null;
    const idDocumentType = formData.get("idDocumentType") as string | null;

    if (!idDocumentFile || typeof idDocumentFile === "string" || typeof idDocumentFile.arrayBuffer !== "function" || !idDocumentType) {
      throw new ValidationError("At least one ID document is required");
    }

    // 4. File uploads buffers verification & compression preparation
    // Profile photo verification
    const photoBuffer = Buffer.from(await photoFile.arrayBuffer());
    if (photoBuffer.length > MAX_FILE_SIZE) {
      throw new ValidationError("Profile photo must be smaller than 5MB");
    }
    const photoFileType = verifyAndGetFileType(photoBuffer);
    if (photoFileType !== "jpg" && photoFileType !== "png") {
      throw new ValidationError("Profile photo must be a JPEG or PNG image");
    }

    // ID document verification
    const idDocsToUpload: Array<{
      buffer: Buffer;
      type: DocumentType;
      name: string;
      mimeType: string;
    }> = [];

    const processDoc = async (file: File | null, docType: string | null) => {
      if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function" || !docType) return;
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.length > MAX_FILE_SIZE) {
        throw new ValidationError(`ID document "${file.name}" must be smaller than 5MB`);
      }
      const fileType = verifyAndGetFileType(buffer);
      if (!fileType) {
        throw new ValidationError(
          `ID document "${file.name}" has an invalid file type. Only JPEG, PNG, and PDF are allowed.`
        );
      }

      const upperDocType = docType.toUpperCase() as DocumentType;
      const validTypes = Object.values(DocumentType);
      if (!validTypes.includes(upperDocType) || upperDocType === DocumentType.PROFILE_PHOTO || upperDocType === DocumentType.PAYMENT_SCREENSHOT) {
        throw new ValidationError(`Invalid document type for ID check: ${docType}`);
      }

      if (fileType === "pdf") {
        idDocsToUpload.push({
          buffer,
          type: upperDocType,
          name: file.name,
          mimeType: "application/pdf",
        });
      } else {
        const compressed = await compressImage(buffer, "document");
        idDocsToUpload.push({
          buffer: compressed.data,
          type: upperDocType,
          name: file.name,
          mimeType: compressed.mimeType,
        });
      }
    };

    await processDoc(idDocumentFile, idDocumentType);

    // Optional second and third documents
    const idDoc2File = formData.get("idDocument2") as File | null;
    const idDoc2Type = formData.get("idDocumentType2") as string | null;
    await processDoc(idDoc2File, idDoc2Type);

    const idDoc3File = formData.get("idDocument3") as File | null;
    const idDoc3Type = formData.get("idDocumentType3") as string | null;
    await processDoc(idDoc3File, idDoc3Type);

    if (idDocsToUpload.length === 0) {
      throw new ValidationError("At least one valid ID document is required");
    }

    // 5. Verify user database unique constraints
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });
    if (existingUser) {
      throw new ConflictError("A user with this phone number is already registered");
    }

    if (data.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (existingEmail) {
        throw new ConflictError("A user with this email is already registered");
      }
    }

    // 6. Find the draft stay and placeholder tenant (by bed, not emergencyContactNumber)
    const stay = await prisma.stay.findFirst({
      where: {
        bedId: onboardingRequest.bedId,
        status: StayStatus.ONBOARDING_PENDING,
        tenant: {
          userId: null,
        },
      },
      include: { tenant: true },
    });

    if (!stay || !stay.tenant) {
      throw new NotFoundError("Associated stay or tenant draft record not found");
    }

    const tenantId = stay.tenant.id;

    let supabaseAuthId: string;

    // 7. Supabase Auth User creation (with orphan cleanup retry)
    const supabase = createAdminClient();

    const createAuthUser = async (): Promise<string> => {
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          phone,
          email: data.email?.toLowerCase() || undefined,
          password: data.password,
          phone_confirm: true,
          email_confirm: !!data.email,
        });

      if (authError || !authData?.user) {
        // If Supabase says "already registered", it's likely an orphaned auth user
        // from a previous failed registration cleanup. Delete it and retry.
        if (authError?.message?.toLowerCase().includes("already")) {
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const orphanedUser = existingUsers?.users?.find(
            (u) => u.phone === phone || u.phone === phone.replace(/^\+/, "")
          );
          if (orphanedUser) {
            await supabase.auth.admin.deleteUser(orphanedUser.id);
            const retry = await supabase.auth.admin.createUser({
              phone,
              email: data.email?.toLowerCase() || undefined,
              password: data.password,
              phone_confirm: true,
              email_confirm: !!data.email,
            });
            if (!retry.error && retry.data?.user) {
              return retry.data.user.id;
            }
          }
        }
        throw new ConflictError(
          authError?.message || "Failed to create Supabase authentication credentials"
        );
      }

      return authData.user.id;
    };

    supabaseAuthId = await createAuthUser();

    try {
      // 8. Compress Profile Photo & Upload all files to private Supabase storage
      const compressedPhoto = await compressImage(photoBuffer, "profile");
      const photoPath = `tenants/${tenantId}/profile_photo_${Date.now()}.jpg`;
      await uploadToStorage(
        compressedPhoto.data,
        photoPath,
        compressedPhoto.mimeType
      );

      const uploadedDocs: Array<{
        storagePath: string;
        fileSizeBytes: number;
        type: DocumentType;
      }> = [];

      // Add profile photo to document upload list
      uploadedDocs.push({
        storagePath: photoPath,
        fileSizeBytes: compressedPhoto.data.length,
        type: DocumentType.PROFILE_PHOTO,
      });

      // Upload ID documents
      for (let i = 0; i < idDocsToUpload.length; i++) {
        const doc = idDocsToUpload[i]!;
        const ext = doc.mimeType === "application/pdf" ? "pdf" : "jpg";
        const docPath = `tenants/${tenantId}/id_${doc.type.toLowerCase()}_${Date.now()}_${i}.${ext}`;
        await uploadToStorage(doc.buffer, docPath, doc.mimeType);
        uploadedDocs.push({
          storagePath: docPath,
          fileSizeBytes: doc.buffer.length,
          type: doc.type,
        });
      }

      // 9. Atomic Prisma database updates
      await prisma.$transaction(async (tx) => {
        // Create User record in Prisma
        const user = await tx.user.create({
          data: {
            supabaseAuthId,
            phone,
            email: data.email?.toLowerCase() || null,
            passwordSetAt: new Date(),
            plainTextPassword: data.password,
            role: UserRole.TENANT,
            organizationId: onboardingRequest.hostel.organizationId,
          },
        });

        // Update placeholder Tenant record with real details
        await tx.tenant.update({
          where: { id: tenantId },
          data: {
            userId: user.id,
            fullName: data.fullName,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            placeOfBirth: data.placeOfBirth,
            permanentAddress: data.permanentAddress,
            emergencyContactName: data.emergencyContactName,
            relationship: data.relationship,
            emergencyContactNumber: data.emergencyContactNumber,
            parentGuardianName: data.parentGuardianName,
            parentGuardianContact: data.parentGuardianContact,
            occupationType: data.occupationType,
            collegeName:
              data.occupationType === OccupationType.STUDENT
                ? data.collegeName
                : null,
            courseOrBranch:
              data.occupationType === OccupationType.STUDENT
                ? data.courseOrBranch
                : null,
            companyName:
              data.occupationType === OccupationType.WORKING_PROFESSIONAL
                ? data.companyName
                : null,
            designation:
              data.occupationType === OccupationType.WORKING_PROFESSIONAL
                ? data.designation
                : null,
            purposeOfStay: data.purposeOfStay,
            photoUrl: photoPath, // Keep storage path as photoUrl
          },
        });

        // Create Document records in database
        for (const doc of uploadedDocs) {
          await tx.document.create({
            data: {
              ownerType: DocumentOwnerType.TENANT,
              tenantId: tenantId,
              documentType: doc.type,
              storagePath: doc.storagePath,
              fileSizeBytes: doc.fileSizeBytes,
              uploadedByUserId: user.id,
            },
          });
        }

        // Set OnboardingRequest status to COMPLETED
        await tx.onboardingRequest.update({
          where: { id: requestId },
          data: {
            status: OnboardingRequestStatus.COMPLETED,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Registration completed successfully",
      });
    } catch (err) {
      // In case of any DB/Storage error, delete the Supabase Auth user to roll back auth state
      await supabase.auth.admin.deleteUser(supabaseAuthId);
      throw err;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
