import { prisma } from "@/lib/db";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "@/lib/errors";
import { rupeesToPaise } from "@/lib/money";
import { StayStatus, PaymentMode, PaymentStatus } from "@prisma/client";

export interface ExtendStayParams {
  stayId: string;
  hostelId: string;
  newEndDate: Date;
  additionalRent: number;
  additionalFoodCharges: number;
  paymentMode: PaymentMode;
  userId: string;
}

export async function extendStay(params: ExtendStayParams) {
  const { stayId, hostelId, newEndDate, additionalRent, additionalFoodCharges, paymentMode, userId } = params;

  if (additionalRent > 100000) {
    throw new ValidationError("Additional rent exceeds maximum transaction limit of ₹1,00,000");
  }
  if (additionalFoodCharges > 100000) {
    throw new ValidationError("Additional food charges exceed maximum transaction limit of ₹1,00,000");
  }

  const stay = await prisma.stay.findUnique({ where: { id: stayId } });

  if (!stay) {
    throw new NotFoundError("Stay record not found");
  }

  if (stay.hostelId !== hostelId) {
    throw new ForbiddenError("You are not authorized to modify this stay");
  }

  if (stay.status !== StayStatus.ACTIVE && stay.status !== StayStatus.EXTENDED) {
    throw new ValidationError("Stay must be ACTIVE or EXTENDED to be extended");
  }

  if (newEndDate.getTime() <= stay.endDate.getTime()) {
    throw new ValidationError("New end date must be after the current end date");
  }

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

  const additionalRentPaise = rupeesToPaise(additionalRent);
  const additionalFoodChargesPaise = rupeesToPaise(additionalFoodCharges);
  const totalAdditionalPaise = additionalRentPaise + additionalFoodChargesPaise;

  await prisma.$transaction(async (tx) => {
    await tx.stay.update({
      where: { id: stayId },
      data: {
        status: StayStatus.EXTENDED,
        endDate: newEndDate,
        totalPayablePaise: stay.totalPayablePaise + totalAdditionalPaise,
      },
    });

    await tx.stayStatusEvent.create({
      data: {
        stayId,
        fromStatus: stay.status,
        toStatus: StayStatus.EXTENDED,
        changedByUserId: userId,
        note: `Stay extended to ${newEndDate.toISOString().split("T")[0]}. Additional Rent: ₹${additionalRent}, Food: ₹${additionalFoodCharges}`,
      },
    });

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
}
