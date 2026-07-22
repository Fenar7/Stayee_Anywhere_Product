import { prisma } from "@/lib/db";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "@/lib/errors";
import { StayStatus, PaymentMode, PaymentStatus } from "@prisma/client";
import { addMonths, addWeeks, addDays } from "date-fns";

export interface ExtendStayParams {
  stayId: string;
  hostelId: string;
  durationType: "MONTHLY" | "WEEKLY" | "CUSTOM";
  customDays?: number;
  discountAddedPaise: number;
  paymentMode: PaymentMode;
  userId: string;
}

export async function extendStay(params: ExtendStayParams) {
  const { stayId, hostelId, durationType, customDays, discountAddedPaise, paymentMode, userId } = params;

  if (discountAddedPaise > 10000000) {
    throw new ValidationError("Discount exceeds maximum limit");
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

  let newEndDate = stay.endDate ? new Date(stay.endDate) : new Date();
  let additionalRentPaise = 0;
  let additionalFoodChargesPaise = 0;

  if (durationType === "MONTHLY") {
    newEndDate = addMonths(newEndDate, 1);
    additionalRentPaise = stay.monthlyRentPaise;
    additionalFoodChargesPaise = stay.foodPlan !== "NOT_INCLUDED" ? stay.foodChargesPaise : 0;
  } else if (durationType === "WEEKLY") {
    newEndDate = addWeeks(newEndDate, 1);
    additionalRentPaise = Math.round(stay.monthlyRentPaise / 4);
    additionalFoodChargesPaise = stay.foodPlan !== "NOT_INCLUDED" ? Math.round(stay.foodChargesPaise / 4) : 0;
  } else if (durationType === "CUSTOM") {
    if (!customDays || customDays <= 0) throw new ValidationError("customDays is required for CUSTOM duration");
    newEndDate = addDays(newEndDate, customDays);
    additionalRentPaise = Math.round((stay.monthlyRentPaise / 30) * customDays);
    additionalFoodChargesPaise = stay.foodPlan !== "NOT_INCLUDED" ? Math.round((stay.foodChargesPaise / 30) * customDays) : 0;
  }

  const totalAdditionalPaise = Math.max(0, additionalRentPaise + additionalFoodChargesPaise - discountAddedPaise);

  const overlappingStay = await prisma.stay.findFirst({
    where: {
      bedId: stay.bedId,
      id: { not: stay.id },
      status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
      joiningDate: { lt: newEndDate },
      ...(stay.endDate ? { endDate: { gt: stay.endDate } } : {}),
    },
  });

  if (overlappingStay) {
    throw new ConflictError("The bed is already reserved or occupied by another active stay during the extension period");
  }

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
        note: `Stay extended to ${newEndDate.toISOString().split("T")[0]}. Added: ₹${(totalAdditionalPaise / 100).toFixed(2)} (Rent: ₹${(additionalRentPaise / 100).toFixed(2)}, Food: ₹${(additionalFoodChargesPaise / 100).toFixed(2)}, Discount: ₹${(discountAddedPaise / 100).toFixed(2)})`,
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
