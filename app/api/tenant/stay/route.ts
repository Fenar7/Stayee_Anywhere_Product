import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { getSignedUrl } from "@/lib/storage";
import { UserRole, StayStatus, DurationType, PaymentStatus } from "@prisma/client";

const STAY_PRIORITY_STATUSES = [StayStatus.ACTIVE, StayStatus.EXTENDED];
const FALLBACK_STATUSES = [StayStatus.APPROVED_AWAITING_PAYMENT, StayStatus.ONBOARDING_PENDING];

const stayQueryInclude = {
  bed: {
    include: {
      room: true,
    },
  },
  payments: true,
} as const;

function calculateNextDueDate(
  joiningDate: Date,
  durationType: DurationType,
  payments: { amountPaidPaise: number; paymentStatus: string }[],
  stay: {
    totalPayablePaise: number;
    monthlyRentPaise: number;
    foodChargesPaise: number;
  }
): string | null {
  if (durationType !== DurationType.MONTHLY) return null;

  const totalVerifiedPaise = payments
    .filter((p) => p.paymentStatus === PaymentStatus.PAID || p.paymentStatus === PaymentStatus.PARTIALLY_PAID)
    .reduce((sum, p) => sum + p.amountPaidPaise, 0);

  const initialPayable = stay.totalPayablePaise;
  const recurringMonthlyCost = stay.monthlyRentPaise + stay.foodChargesPaise;

  if (totalVerifiedPaise < initialPayable) {
    return joiningDate.toISOString();
  }

  const additionalMonthsPaid = recurringMonthlyCost > 0
    ? Math.floor((totalVerifiedPaise - initialPayable) / recurringMonthlyCost)
    : 0;

  const totalMonthsPaid = 1 + additionalMonthsPaid;

  const nextDue = new Date(joiningDate);
  nextDue.setMonth(nextDue.getMonth() + totalMonthsPaid);

  return nextDue.toISOString();
}

export async function GET() {
  try {
    const session = await requireRole([UserRole.TENANT]);

    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
    });

    if (!tenant) {
      throw new NotFoundError("Tenant profile not found");
    }

    let stay = await prisma.stay.findFirst({
      where: {
        tenantId: tenant.id,
        status: { in: STAY_PRIORITY_STATUSES },
      },
      include: stayQueryInclude,
      orderBy: { createdAt: "desc" },
    });

    if (!stay) {
      stay = await prisma.stay.findFirst({
        where: {
          tenantId: tenant.id,
          status: { in: FALLBACK_STATUSES },
        },
        include: stayQueryInclude,
        orderBy: { createdAt: "desc" },
      });
    }

    if (!stay) {
      return NextResponse.json({ stay: null });
    }

    const hostel = await prisma.hostel.findUnique({
      where: { id: stay.hostelId },
    });

    let roommates: {
      fullName: string;
      photoUrl: string | null;
      occupationType: string;
      collegeName: string | null;
      companyName: string | null;
      designation: string | null;
      bedLabel: string;
    }[] = [];

    if (stay.status === StayStatus.ACTIVE || stay.status === StayStatus.EXTENDED) {
      const roommateStays = await prisma.stay.findMany({
        where: {
          bed: {
            roomId: stay.bed.room.id,
          },
          tenantId: { not: tenant.id },
          status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
        },
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
            select: {
              label: true,
            },
          },
        },
      });

      roommates = await Promise.all(
        roommateStays.map(async (rs) => {
          let photoUrl: string | null = null;
          if (rs.tenant.photoUrl) {
            try {
              photoUrl = await getSignedUrl(rs.tenant.photoUrl);
            } catch {
              photoUrl = null;
            }
          }
          return {
            fullName: rs.tenant.fullName,
            photoUrl,
            occupationType: rs.tenant.occupationType,
            collegeName: rs.tenant.collegeName,
            companyName: rs.tenant.companyName,
            designation: rs.tenant.designation,
            bedLabel: rs.bed.label,
          };
        })
      );
    }

    const nextDueDate =
      stay.status === StayStatus.ACTIVE || stay.status === StayStatus.EXTENDED
        ? calculateNextDueDate(stay.joiningDate, stay.durationType as DurationType, stay.payments, stay)
        : null;

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
      },
      hostel: hostel
        ? {
            id: hostel.id,
            name: hostel.name,
            address: hostel.address,
          }
        : null,
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
      roommates,
      nextDueDate,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
