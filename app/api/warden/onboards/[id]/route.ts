import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { getSignedUrl } from "@/lib/storage";
import { UserRole } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { id } = await params;

    // Fetch the Stay with full relations
    const stay = await prisma.stay.findUnique({
      where: { id },
      include: {
        tenant: {
          include: {
            user: true,
            documents: true,
          },
        },
        bed: {
          include: {
            room: true,
          },
        },
        payments: {
          include: {
            screenshotDocument: true,
          },
        },
      },
    });

    if (!stay) {
      throw new NotFoundError("Stay record not found");
    }

    const hostelId = await resolveHostelId(session, request, stay.hostelId);

    // Verify warden scope: stay must belong to the warden's hostel
    if (session.user.role !== UserRole.MAIN_ADMIN && stay.hostelId !== hostelId) {
      throw new ForbiddenError("You are not authorized to view this stay record");
    }

    // Fetch hostel payment config for UPI ID
    const paymentConfig = await prisma.hostelPaymentConfig.findUnique({
      where: { hostelId },
    });

    // Generate signed URLs for all documents
    const documentsWithUrls = await Promise.all(
      stay.tenant.documents.map(async (doc) => {
        try {
          const signedUrl = await getSignedUrl(doc.storagePath);
          return {
            id: doc.id,
            documentType: doc.documentType,
            fileSizeBytes: doc.fileSizeBytes,
            createdAt: doc.createdAt,
            signedUrl,
          };
        } catch (err) {
          console.error(`Failed to generate signed URL for document ${doc.id}:`, err);
          return {
            id: doc.id,
            documentType: doc.documentType,
            fileSizeBytes: doc.fileSizeBytes,
            createdAt: doc.createdAt,
            signedUrl: null,
          };
        }
      })
    );

    // Generate signed URLs for payment screenshot documents
    const paymentsWithUrls = await Promise.all(
      stay.payments.map(async (pmt) => {
        let screenshotUrl = null;
        if (pmt.screenshotDocument) {
          try {
            screenshotUrl = await getSignedUrl(pmt.screenshotDocument.storagePath);
          } catch (err) {
            console.error(`Failed to generate signed URL for payment screenshot ${pmt.id}:`, err);
          }
        }
        return {
          id: pmt.id,
          amountPaid: pmt.amountPaidPaise / 100,
          paymentMode: pmt.paymentMode,
          transactionRefNo: pmt.transactionRefNo,
          receivedBy: pmt.receivedBy,
          paymentStatus: pmt.paymentStatus,
          verifiedAt: pmt.verifiedAt,
          createdAt: pmt.createdAt,
          screenshotUrl,
        };
      })
    );

    // Fetch corresponding onboarding request
    const matchingReq = await prisma.onboardingRequest.findFirst({
      where: {
        hostelId: stay.hostelId,
        bedId: stay.bedId,
        status: "PENDING",
      },
    });

    const rawPhone = stay.tenant.user?.phone || "";
    const isUuid = rawPhone.includes("-") || rawPhone.length > 20;
    const displayPhone = !isUuid && rawPhone ? rawPhone : (stay.tenant.emergencyContactNumber || matchingReq?.phone || "");

    return NextResponse.json({
      stay: {
        id: stay.id,
        status: stay.status,
        durationType: stay.durationType,
        joiningDate: stay.joiningDate,
        endDate: stay.endDate,
        isNewAdmission: stay.isNewAdmission,
        admissionFee: stay.admissionFeePaise / 100,
        monthlyRent: stay.monthlyRentPaise / 100,
        securityDeposit: stay.securityDepositPaise / 100,
        foodCharges: stay.foodChargesPaise / 100,
        foodPlan: stay.foodPlan,
        totalPayable: stay.totalPayablePaise / 100,
        discount: stay.discountPaise / 100,
        onboardingRequest: matchingReq
          ? {
              id: matchingReq.id,
              status: matchingReq.status,
              onboardingCurrentStep: matchingReq.onboardingCurrentStep,
              createdAt: matchingReq.createdAt,
            }
          : null,
      },
      tenant: {
        id: stay.tenant.id,
        fullName: stay.tenant.fullName,
        dateOfBirth: stay.tenant.dateOfBirth,
        gender: stay.tenant.gender,
        placeOfBirth: stay.tenant.placeOfBirth,
        permanentAddress: stay.tenant.permanentAddress,
        emergencyContactName: stay.tenant.emergencyContactName,
        relationship: stay.tenant.relationship,
        emergencyContactNumber: stay.tenant.emergencyContactNumber,
        parentGuardianName: stay.tenant.parentGuardianName,
        parentGuardianContact: stay.tenant.parentGuardianContact,
        occupationType: stay.tenant.occupationType,
        collegeName: stay.tenant.collegeName,
        courseOrBranch: stay.tenant.courseOrBranch,
        companyName: stay.tenant.companyName,
        designation: stay.tenant.designation,
        purposeOfStay: stay.tenant.purposeOfStay,
        phone: displayPhone,
        email: stay.tenant.user?.email || "",
        plainTextPassword: stay.tenant.user?.plainTextPassword || null,
        documents: documentsWithUrls,
      },
      bed: {
        id: stay.bed.id,
        label: stay.bed.label,
        roomNumber: stay.bed.room.roomNumber,
        sharingType: stay.bed.room.sharingType,
      },
      payments: paymentsWithUrls,
      upiId: paymentConfig?.upiId || null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
