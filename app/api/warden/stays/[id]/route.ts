import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { paiseToRupees } from "@/lib/money";
import { UserRole } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { id: stayId } = await params;

    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
      include: {
        tenant: {
          select: {
            id: true,
            fullName: true,
            user: { select: { email: true, phone: true } },
            dateOfBirth: true,
            gender: true,
            placeOfBirth: true,
            permanentAddress: true,
            emergencyContactName: true,
            emergencyContactNumber: true,
            relationship: true,
            parentGuardianName: true,
            parentGuardianContact: true,
            photoUrl: true,
            occupationType: true,
            collegeName: true,
            courseOrBranch: true,
            companyName: true,
            designation: true,
            documents: {
              where: { documentType: { in: ["AADHAAR", "PASSPORT_PHOTO", "PAN"] } },
              select: { documentType: true, storagePath: true }
            }
          },
        },
        bed: {
          include: {
            room: true,
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
        refundInvoices: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!stay) {
      throw new NotFoundError("Stay record not found");
    }

    const hostelId = await resolveHostelId(session, request, stay.hostelId);

    if (session.user.role !== UserRole.MAIN_ADMIN && stay.hostelId !== hostelId) {
      throw new ForbiddenError("You are not authorized to view this stay");
    }

    return NextResponse.json({
      stay: {
        id: stay.id,
        status: stay.status,
        durationType: stay.durationType,
        joiningDate: stay.joiningDate,
        endDate: stay.endDate,
        admissionFee: paiseToRupees(stay.admissionFeePaise),
        monthlyRent: paiseToRupees(stay.monthlyRentPaise),
        securityDeposit: paiseToRupees(stay.securityDepositPaise),
        foodCharges: paiseToRupees(stay.foodChargesPaise),
        foodPlan: stay.foodPlan,
        totalPayable: paiseToRupees(stay.totalPayablePaise),
        discount: paiseToRupees(stay.discountPaise),
        tenant: {
          ...stay.tenant,
          phone: stay.tenant.user?.phone || "",
          user: { email: stay.tenant.user?.email || null },
          idDocumentUrl: stay.tenant.documents?.[0]?.storagePath || null,
          idDocumentType: stay.tenant.documents?.[0]?.documentType || null,
        },
        bed: {
          id: stay.bed.id,
          label: stay.bed.label,
          roomNumber: stay.bed.room.roomNumber,
          sharingType: stay.bed.room.sharingType,
        },
        payments: stay.payments.map((p) => ({
          id: p.id,
          amountPaid: paiseToRupees(p.amountPaidPaise),
          paymentMode: p.paymentMode,
          transactionRefNo: p.transactionRefNo,
          paymentStatus: p.paymentStatus,
          createdAt: p.createdAt,
        })),
        refundInvoices: stay.refundInvoices.map((r) => ({
          id: r.id,
          refundAmountPaise: r.refundAmountPaise,
          daysUsed: r.daysUsed,
          daysRemaining: r.daysRemaining,
          notes: r.notes,
          pdfDocumentId: r.pdfDocumentId,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
