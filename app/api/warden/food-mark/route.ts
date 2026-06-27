import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, ValidationError, NotFoundError } from "@/lib/errors";
import { UserRole, StayStatus } from "@prisma/client";

/**
 * POST /api/warden/food-mark
 *
 * Allows wardens and admins to toggle meal attendance for a specific stay/date.
 * Unlike the tenant endpoint, this bypasses the cutoff restriction — wardens
 * can mark attendance at any time (e.g. at the kitchen door).
 *
 * Body:
 *   - stayId: string  (UUID of the Stay)
 *   - forDate: string (YYYY-MM-DD)
 *   - breakfast?: boolean
 *   - lunch?: boolean
 *   - dinner?: boolean
 *
 * Access: WARDEN or MAIN_ADMIN
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const hostelId = await resolveHostelId(session, request);

    const body = await request.json();
    const { stayId, forDate: forDateRaw, breakfast, lunch, dinner } = body;

    if (!stayId || typeof stayId !== "string") {
      throw new ValidationError("stayId is required");
    }
    if (!forDateRaw || typeof forDateRaw !== "string") {
      throw new ValidationError("forDate is required (YYYY-MM-DD)");
    }
    if (breakfast === undefined && lunch === undefined && dinner === undefined) {
      throw new ValidationError("At least one of breakfast, lunch, or dinner must be provided");
    }

    // Parse date in IST
    const forDate = new Date(`${forDateRaw}T00:00:00.000+05:30`);
    if (isNaN(forDate.getTime())) {
      throw new ValidationError("Invalid forDate format. Use YYYY-MM-DD");
    }

    // Verify the stay belongs to this hostel
    const stay = await prisma.stay.findFirst({
      where: {
        id: stayId,
        hostelId,
        status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
      },
      select: { id: true, foodPlan: true },
    });

    if (!stay) {
      throw new NotFoundError("Stay not found or not active in this hostel");
    }

    // Get existing order to merge fields
    const existing = await prisma.foodOrder.findUnique({
      where: { stayId_forDate: { stayId, forDate } },
    });

    const updatedBreakfast = breakfast !== undefined ? breakfast : (existing?.breakfast ?? false);
    const updatedLunch = lunch !== undefined ? lunch : (existing?.lunch ?? false);
    const updatedDinner = dinner !== undefined ? dinner : (existing?.dinner ?? false);

    const foodOrder = await prisma.foodOrder.upsert({
      where: { stayId_forDate: { stayId, forDate } },
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

    return NextResponse.json({
      success: true,
      foodOrder: {
        forDate: foodOrder.forDate.toISOString(),
        breakfast: foodOrder.breakfast,
        lunch: foodOrder.lunch,
        dinner: foodOrder.dinner,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
