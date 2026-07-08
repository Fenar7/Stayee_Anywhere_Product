import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { isPastFoodCutoff } from "@/lib/dates/food-cutoff";
import { UserRole, StayStatus } from "@prisma/client";
import { toggleSchema } from "@/lib/validation/food";
import { updateFoodOrder, getFoodOrdersInRange, getActiveStayForFoodOrdering } from "@/services/food/food.service";

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

    const stay = await getActiveStayForFoodOrdering(session.user.id);

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

    const days = await getFoodOrdersInRange(stay.id, startDate, endDate);

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


export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);

    const stay = await getActiveStayForFoodOrdering(session.user.id);

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

    const foodOrder = await updateFoodOrder(stay.id, forDate, {
      breakfast,
      lunch,
      dinner,
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
