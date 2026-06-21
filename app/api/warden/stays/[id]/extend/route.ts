import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  handleApiError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from "@/lib/errors";
import { UserRole, StayStatus, PaymentMode, PaymentStatus } from "@prisma/client";

const extendSchema = z.object({
  newEndDate: z.string().transform((val) => new Date(val)),
  additionalRent: z.number().nonnegative(),
  additionalFoodCharges: z.number().nonnegative(),
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.UPI),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const warden = session.user.warden!;
    const hostelId = warden.hostelId;

    const { id: stayId } = await params;

    const body = await request.json();
    const parsed = extendSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid body");
    }
    const { newEndDate, additionalRent, additionalFoodCharges, paymentMode } = parsed.data;

    if (additionalRent > 100000) {
      throw new ValidationError("Additional rent exceeds maximum transaction limit of ₹1,00,000");
    }
    if (additionalFoodCharges > 100000) {
      throw new ValidationError("Additional food charges exceed maximum transaction limit of ₹1,00,000");
    }

    // Fetch the Stay
    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
    });

    if (!stay) {
      throw new NotFoundError("Stay record not found");
    }

    if (stay.hostelId !== hostelId) {
      throw new ForbiddenError("You are not authorized to modify this stay");
    }

    if (stay.status !== StayStatus.ACTIVE && stay.status !== StayStatus.EXTENDED) {
      throw new ValidationError("Stay must be ACTIVE or EXTENDED to be extended");
    }

    // Verify newEndDate is after current endDate
    if (newEndDate.getTime() <= stay.endDate.getTime()) {
      throw new ValidationError("New end date must be after the current end date");
    }

    // Check for bed conflict during the extension period
    const overlappingStay = await prisma.stay.findFirst({
      where: {
        bedId: stay.bedId,
        id: { not: stay.id },
        status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
        joiningDate: { lt: newEndDate },
        endDate: { gt: stay.endDate },
      },
    });

    if (overlappingStay) {
      throw new ConflictError("The bed is already reserved or occupied by another active stay during the extension period");
    }

    const additionalRentPaise = Math.round(additionalRent * 100);
    const additionalFoodChargesPaise = Math.round(additionalFoodCharges * 100);
    const totalAdditionalPaise = additionalRentPaise + additionalFoodChargesPaise;

    await prisma.$transaction(async (tx) => {
      // 1. Update stay status, endDate, and totalPayablePaise
      await tx.stay.update({
        where: { id: stayId },
        data: {
          status: StayStatus.EXTENDED,
          endDate: newEndDate,
          totalPayablePaise: stay.totalPayablePaise + totalAdditionalPaise,
        },
      });

      // 2. Log status change event
      await tx.stayStatusEvent.create({
        data: {
          stayId,
          fromStatus: stay.status,
          toStatus: StayStatus.EXTENDED,
          changedByUserId: session.user.id,
          note: `Stay extended to ${newEndDate.toISOString().split("T")[0]}. Additional Rent: ₹${additionalRent}, Food: ₹${additionalFoodCharges}`,
        },
      });

      // 3. Create a pending payment record for the extension amount
      if (totalAdditionalPaise > 0) {
        await tx.payment.create({
          data: {
            stayId,
            amountPaidPaise: totalAdditionalPaise,
            paymentMode,
            receivedBy: "System (Extension Request)",
            paymentStatus: PaymentStatus.PENDING,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Stay successfully extended",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
