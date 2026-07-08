import { prisma } from "@/lib/db";
import { isPastFoodCutoff } from "@/lib/dates/food-cutoff";
import { ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { StayStatus } from "@prisma/client";

export async function getActiveStayForFoodOrdering(userId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { userId },
  });

  if (!tenant) {
    throw new NotFoundError("Tenant profile not found");
  }

  const stay = await prisma.stay.findFirst({
    where: {
      tenantId: tenant.id,
      status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
    },
    select: { id: true, foodPlan: true, status: true, joiningDate: true },
  });

  if (!stay) {
    throw new ForbiddenError("No active stay found. Food ordering is only available for active residents.");
  }

  if (stay.foodPlan === "NOT_INCLUDED") {
    throw new ForbiddenError("Food ordering is not available on your stay plan");
  }

  return stay;
}

export async function validateCutoff(forDate: Date): Promise<{ isOpen: boolean; closedAt?: Date }> {
  const pastCutoff = isPastFoodCutoff(forDate);
  if (pastCutoff) {
    const closedAt = new Date(forDate.getTime());
    closedAt.setUTCDate(closedAt.getUTCDate() - 1);
    closedAt.setUTCHours(22, 0, 0, 0); // 10 PM IST (using UTC setter for consistency)
    return { isOpen: false, closedAt };
  }
  return { isOpen: true };
}

export async function getOrCreateFoodOrder(stayId: string, forDate: Date) {
  const existing = await prisma.foodOrder.findUnique({
    where: { stayId_forDate: { stayId, forDate } },
  });

  if (existing) {
    return existing;
  }

  return prisma.foodOrder.create({
    data: {
      stayId,
      forDate,
      breakfast: false,
      lunch: false,
      dinner: false,
    },
  });
}

export async function updateFoodOrder(
  stayId: string,
  forDate: Date,
  meals: { breakfast?: boolean; lunch?: boolean; dinner?: boolean }
) {
  const { isOpen } = await validateCutoff(forDate);
  if (!isOpen) {
    throw new ValidationError(
      "Cannot modify food orders past the 10:00 PM IST cutoff. Orders for tomorrow must be placed before 10 PM tonight."
    );
  }

  if (meals.breakfast === undefined && meals.lunch === undefined && meals.dinner === undefined) {
    throw new ValidationError("At least one of breakfast, lunch, or dinner must be provided");
  }

  const existing = await prisma.foodOrder.findUnique({
    where: { stayId_forDate: { stayId, forDate } },
  });

  const updatedBreakfast = meals.breakfast ?? existing?.breakfast ?? false;
  const updatedLunch = meals.lunch ?? existing?.lunch ?? false;
  const updatedDinner = meals.dinner ?? existing?.dinner ?? false;

  return prisma.foodOrder.upsert({
    where: {
      stayId_forDate: { stayId, forDate },
    },
    create: {
      stayId,
      forDate,
      breakfast: updatedBreakfast,
      lunch: updatedLunch,
      dinner: updatedDinner,
    },
    update: {
      breakfast: updatedBreakfast,
      lunch: updatedLunch,
      dinner: updatedDinner,
    },
  });
}

export async function getFoodOrdersInRange(stayId: string, startDate: Date, endDate: Date) {
  const existingOrders = await prisma.foodOrder.findMany({
    where: {
      stayId,
      forDate: { gte: startDate, lte: endDate },
    },
    select: {
      forDate: true,
      breakfast: true,
      lunch: true,
      dinner: true,
      confirmedAt: true,
      lockedAt: true,
    },
  });

  const orderMap = new Map(existingOrders.map((o) => [o.forDate.toISOString(), o]));
  const days = [];

  const current = new Date(startDate);
  while (current <= endDate) {
    const isoDate = current.toISOString();
    const existing = orderMap.get(isoDate);
    const { isOpen } = await validateCutoff(current);

    days.push({
      forDate: isoDate,
      breakfast: existing?.breakfast ?? false,
      lunch: existing?.lunch ?? false,
      dinner: existing?.dinner ?? false,
      isEditable: isOpen,
      confirmedAt: existing?.confirmedAt?.toISOString() ?? null,
      lockedAt: existing?.lockedAt?.toISOString() ?? null,
    });

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}
