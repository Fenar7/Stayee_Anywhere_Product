import { prisma } from "@/lib/db";
import { formatRupees } from "@/lib/money";
import { uploadToStorage } from "@/lib/storage";
import { renderRegistrationForm } from "@/lib/pdf/render";
import type { RegistrationFormData } from "@/lib/pdf/templates/registration-form";
import { DocumentType, DocumentOwnerType, StayStatus } from "@prisma/client";

export interface GenerateRegistrationFormResult {
  documentId: string;
  storagePath: string;
}

const BLOCKED_STATUSES: StayStatus[] = [StayStatus.ONBOARDING_PENDING];

/**
 * Generate a 2-Page Resident Registration Form PDF.
 */
export async function generateRegistrationForm(
  stayId: string,
  uploaderUserId: string
): Promise<GenerateRegistrationFormResult> {
  const stay = await prisma.stay.findUnique({
    where: { id: stayId },
    include: {
      tenant: true,
      bed: { include: { room: true } },
      hostel: true,
    },
  });

  if (!stay) throw new Error(`Stay not found: ${stayId}`);

  if (BLOCKED_STATUSES.includes(stay.status)) {
    throw new Error(`Cannot generate registration form for stay in ${stay.status} status`);
  }

  const tenant = stay.tenant;
  const bed = stay.bed;
  const room = bed.room;
  const hostel = stay.hostel;

  // Fetch tenant documents for the checklist
  const docs = await prisma.document.findMany({
    where: {
      tenantId: tenant.id,
      documentType: { in: ["AADHAAR", "PAN", "PASSPORT_PHOTO", "COLLEGE_ID", "COMPANY_ID"] },
    },
    select: { documentType: true },
  });

  const docTypes = new Set(docs.map((d) => d.documentType));

  // Fetch profile photo signed URL if available
  let photoUrl: string | undefined;
  if (tenant.photoUrl) {
    try {
      const { getSignedUrl } = await import("@/lib/storage");
      photoUrl = await getSignedUrl(tenant.photoUrl, 900);
    } catch {
      photoUrl = undefined;
    }
  }

  const data: RegistrationFormData = {
    generatedAt: new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    }),
    stayId: stay.id,
    hostelName: hostel.name,
    tenant: {
      fullName: tenant.fullName,
      dateOfBirth: tenant.dateOfBirth.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }),
      gender: tenant.gender,
      placeOfBirth: tenant.placeOfBirth,
      permanentAddress: tenant.permanentAddress,
      emergencyContactName: tenant.emergencyContactName,
      relationship: tenant.relationship,
      emergencyContactNumber: tenant.emergencyContactNumber,
      parentGuardianName: tenant.parentGuardianName,
      parentGuardianContact: tenant.parentGuardianContact,
      occupationType: tenant.occupationType,
      collegeName: tenant.collegeName ?? undefined,
      courseOrBranch: tenant.courseOrBranch ?? undefined,
      companyName: tenant.companyName ?? undefined,
      designation: tenant.designation ?? undefined,
      purposeOfStay: tenant.purposeOfStay,
      photoUrl,
    },
    accommodation: {
      roomNumber: room.roomNumber,
      bedLabel: bed.label,
      sharingType: room.sharingType,
    },
    fees: {
      admissionFee: formatRupees(stay.admissionFeePaise),
      securityDeposit: formatRupees(stay.securityDepositPaise),
      monthlyRent: formatRupees(stay.monthlyRentPaise),
      foodCharges: formatRupees(stay.foodChargesPaise),
      totalPayable: formatRupees(stay.totalPayablePaise),
    },
    marketing: {
      executive: stay.marketingExecutive ?? "",
      leadSource: stay.leadSource ?? "",
    },
    documents: {
      aadhaar: docTypes.has("AADHAAR"),
      pan: docTypes.has("PAN"),
      passportPhoto: docTypes.has("PASSPORT_PHOTO"),
      collegeId: docTypes.has("COLLEGE_ID"),
      companyId: docTypes.has("COMPANY_ID"),
    },
    affidavitText: hostel.affidavitText ?? undefined,
  };

  const pdfBuffer = await renderRegistrationForm(data);

  const storagePath = `registration_forms/reg_form_${stayId}.pdf`;
  await uploadToStorage(pdfBuffer, storagePath, "application/pdf");

  const document = await prisma.document.create({
    data: {
      ownerType: DocumentOwnerType.STAY,
      stayId: stay.id,
      documentType: DocumentType.REGISTRATION_FORM_PDF,
      storagePath,
      fileSizeBytes: pdfBuffer.length,
      uploadedByUserId: uploaderUserId,
    },
  });

  return {
    documentId: document.id,
    storagePath,
  };
}
