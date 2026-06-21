import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const warden = session.user.warden!;
    const hostelId = warden.hostelId;

    const { id: stayId } = await params;

    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
      include: {
        tenant: {
          select: {
            fullName: true,
            photoUrl: true,
            occupationType: true,
            collegeName: true,
            companyName: true,
            designation: true,
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
      },
    });

    if (!stay) {
      throw new NotFoundError("Stay record not found");
    }

    if (stay.hostelId !== hostelId) {
      throw new ForbiddenError("You are not authorized to view this stay");
    }

    return NextResponse.json({
      stay: {
        id: stay.id,
        status: stay.status,
        durationType: stay.durationType,
        joiningDate: stay.joiningDate,
        endDate: stay.endDate,
        admissionFee: stay.admissionFeePaise / 100,
        monthlyRent: stay.monthlyRentPaise / 100,
        securityDeposit: stay.securityDepositPaise / 100,
        foodCharges: stay.foodChargesPaise / 100,
        foodPlan: stay.foodPlan,
        totalPayable: stay.totalPayablePaise / 100,
        discount: stay.discountPaise / 100,
        tenant: stay.tenant,
        bed: {
          id: stay.bed.id,
          label: stay.bed.label,
          roomNumber: stay.bed.room.roomNumber,
          sharingType: stay.bed.room.sharingType,
        },
        payments: stay.payments.map((p) => ({
          id: p.id,
          amountPaid: p.amountPaidPaise / 100,
          paymentMode: p.paymentMode,
          transactionRefNo: p.transactionRefNo,
          paymentStatus: p.paymentStatus,
          createdAt: p.createdAt,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
