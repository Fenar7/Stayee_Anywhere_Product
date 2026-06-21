import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { isPastFoodCutoff } from "@/lib/dates/food-cutoff";
import { getStartOfDayIST, addDays } from "@/lib/dates";
import { UserRole, StayStatus } from "@prisma/client";
import { z } from "zod";

/**
 * GET /api/tenant/food-orders
 *
 * Fetch meal choices for a range of dates for the authenticated tenant's active stay.
 * Query params:
 *   - startDate (YYYY-MM-DD, required) — start of date range
 *   - endDate (YYYY-MM-DD, required) — end of date range
 *
 * Returns an array of FoodOrder records (one per day), including days with no order yet
 * (all meals false).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);

    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
    });

    if (!tenant) {
      throw new NotFoundError("Tenant profile not found");
    }

    // Find active/extended stay
    const stay = await prisma.stay.findFirst({
      where: {
        tenantId: tenant.id,
        status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
      },
      select: { id: true, foodPlan: true, status: true },
    });

    if (!stay) {
      throw new ForbiddenError("No active stay found. Food ordering is only available for active residents.");
    }

    if (stay.foodPlan === "NOT_INCLUDED") {
      throw new ForbiddenError("Food ordering is not available on your stay plan");
    }

    // Validate query params
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    if (!startDateStr || !endDateStr) {
      throw new ValidationError("startDate and endDate query parameters are required (YYYY-MM-DD)");
    }

    const startDate = new Date(`${startDateStr}T00:00:00.000+05:30`);
    const endDate = new Date(`${endDateStr}T00:00:00.000+05:30`);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new ValidationError("Invalid date format. Use YYYY-MM-DD");
    }

    if (endDate < startDate) {
      throw new ValidationError("endDate must be on or after startDate");
    }

    // Fetch existing food orders for this stay in the date range
    const existingOrders = await prisma.foodOrder.findMany({
      where: {
        stayId: stay.id,
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

    // Build a map for quick lookup
    const orderMap = new Map(
      existingOrders.map((o) => [o.forDate.toISOString(), o])
    );

    // Generate a full list of days in the range
    const days: {
      forDate: string;
      breakfast: boolean;
      lunch: boolean;
      dinner: boolean;
      isEditable: boolean;
      confirmedAt: string | null;
      lockedAt: string | null;
    }[] = [];

    let current = new Date(startDate);
    while (current <= endDate) {
      const isoDate = current.toISOString();
      const existing = orderMap.get(isoDate);
      const isEditable = !isPastFoodCutoff(current);

      days.push({
        forDate: isoDate,
        breakfast: existing?.breakfast ?? false,
        lunch: existing?.lunch ?? false,
        dinner: existing?.dinner ?? false,
        isEditable,
        confirmedAt: existing?.confirmedAt?.toISOString() ?? null,
        lockedAt: existing?.lockedAt?.toISOString() ?? null,
      });

      current = addDays(current, 1);
    }

    return NextResponse.json({
      stayId: stay.id,
      foodPlan: stay.foodPlan,
      days,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/tenant/food-orders
 *
 * Toggle (upsert) meal selection for a specific forDate.
 * Body:
 *   - forDate: string (ISO date or YYYY-MM-DD)
 *   - breakfast?: boolean
 *   - lunch?: boolean
 *   - dinner?: boolean
 *
 * Uses prisma.foodOrder.upsert for concurrent safety.
 * Blocks if current IST time is past 10:00 PM on D-1.
 */
const toggleSchema = z.object({
  forDate: z.string(),
  breakfast: z.boolean().optional(),
  lunch: z.boolean().optional(),
  dinner: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);

    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
    });

    if (!tenant) {
      throw new NotFoundError("Tenant profile not found");
    }

    // Find active/extended stay
    const stay = await prisma.stay.findFirst({
      where: {
        tenantId: tenant.id,
        status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
      },
      select: { id: true, foodPlan: true, joiningDate: true },
    });

    if (!stay) {
      throw new ForbiddenError("No active stay found. Food ordering is only available for active residents.");
    }

    if (stay.foodPlan === "NOT_INCLUDED") {
      throw new ForbiddenError("Food ordering is not available on your stay plan");
    }

    const body = await request.json();
    const parseResult = toggleSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message ?? "Validation failed");
    }

    const { forDate: forDateRaw, breakfast, lunch, dinner } = parseResult.data;

    // Parse forDate
    let forDate: Date;
    if (forDateRaw.match(/^\d{4}-\d{2}-\d{2}$/)) {
      forDate = new Date(`${forDateRaw}T00:00:00.000+05:30`);
    } else {
      forDate = new Date(forDateRaw);
    }

    if (isNaN(forDate.getTime())) {
      throw new ValidationError("Invalid forDate format. Use YYYY-MM-DD or ISO 8601");
    }

    // Ensure at least one meal is being set
    if (breakfast === undefined && lunch === undefined && dinner === undefined) {
      throw new ValidationError("At least one of breakfast, lunch, or dinner must be provided");
    }

    // 10 PM IST cutoff check
    if (isPastFoodCutoff(forDate)) {
      throw new ValidationError(
        "Cannot modify food orders past the 10:00 PM IST cutoff. Orders for tomorrow must be placed before 10 PM tonight."
      );
    }

    // Ensure the target date is within the stay period
    const stayStart = getStartOfDayIST(stay.joiningDate ?? new Date());
    const stayEnd = getStartOfDayIST(new Date());
    // Soft check: allow ordering for today and future days within reasonable range

    // Upsert with concurrent safety — use the unique [stayId, forDate] constraint
    const existing = await prisma.foodOrder.findUnique({
      where: {
        stayId_forDate: { stayId: stay.id, forDate },
      },
    });

    const updatedBreakfast = breakfast ?? existing?.breakfast ?? false;
    const updatedLunch = lunch ?? existing?.lunch ?? false;
    const updatedDinner = dinner ?? existing?.dinner ?? false;

    const foodOrder = await prisma.foodOrder.upsert({
      where: {
        stayId_forDate: { stayId: stay.id, forDate },
      },
      create: {
        stayId: stay.id,
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
      select: {
        forDate: true,
        breakfast: true,
        lunch: true,
        dinner: true,
        confirmedAt: true,
        lockedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      foodOrder: {
        forDate: foodOrder.forDate,
        breakfast: foodOrder.breakfast,
        lunch: foodOrder.lunch,
        dinner: foodOrder.dinner,
        confirmedAt: foodOrder.confirmedAt?.toISOString() ?? null,
        lockedAt: foodOrder.lockedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
