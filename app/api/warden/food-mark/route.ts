import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, ValidationError, NotFoundError } from "@/lib/errors";
import { UserRole, StayStatus } from "@prisma/client";

/**
 * POST /api/warden/food-mark
 *
 * Allows wardens and admins to toggle any meal for a specific stay/date.
 * Bypasses the 10 PM cutoff — wardens can mark at the kitchen door at any time.
 *
 * Supported meal fields: breakfast, lunch, dinner, tea, cutFruits, gymDiet
 *
 * Body:
 *   - stayId:     string   (UUID of the Stay)
 *   - forDate:    string   (YYYY-MM-DD)
 *   - breakfast?: boolean
 *   - lunch?:     boolean
 *   - dinner?:    boolean
 *   - tea?:       boolean
 *   - cutFruits?: boolean
 *   - gymDiet?:   boolean
 *
 * Access: WARDEN or MAIN_ADMIN
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const hostelId = await resolveHostelId(session, request);

    const body = await request.json();
    const {
      stayId,
      forDate: forDateRaw,
      breakfast,
      lunch,
      dinner,
      tea,
      cutFruits,
      gymDiet,
    } = body;

    if (!stayId || typeof stayId !== "string") {
      throw new ValidationError("stayId is required");
    }
    if (!forDateRaw || typeof forDateRaw !== "string") {
      throw new ValidationError("forDate is required (YYYY-MM-DD)");
    }
    if (
      breakfast === undefined &&
      lunch === undefined &&
      dinner === undefined &&
      tea === undefined &&
      cutFruits === undefined &&
      gymDiet === undefined
    ) {
      throw new ValidationError("At least one meal field must be provided");
    }

    // Parse date in IST
    const forDate = new Date(`${forDateRaw}T00:00:00.000+05:30`);
    if (isNaN(forDate.getTime())) {
      throw new ValidationError("Invalid forDate format. Use YYYY-MM-DD");
    }

    // Verify the stay belongs to this hostel and is active
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

    // Get existing order to merge only the provided fields
    const existing = await prisma.foodOrder.findUnique({
      where: { stayId_forDate: { stayId, forDate } },
    });

    const updated = await prisma.foodOrder.upsert({
      where: { stayId_forDate: { stayId, forDate } },
      create: {
        stayId,
        forDate,
        breakfast: breakfast ?? false,
        lunch: lunch ?? false,
        dinner: dinner ?? false,
        tea: tea ?? false,
        cutFruits: cutFruits ?? false,
        gymDiet: gymDiet ?? false,
      },
      update: {
        ...(breakfast !== undefined && { breakfast }),
        ...(lunch !== undefined && { lunch }),
        ...(dinner !== undefined && { dinner }),
        ...(tea !== undefined && { tea }),
        ...(cutFruits !== undefined && { cutFruits }),
        ...(gymDiet !== undefined && { gymDiet }),
      },
    });

    return NextResponse.json({
      success: true,
      foodOrder: {
        forDate: updated.forDate.toISOString(),
        breakfast: updated.breakfast,
        lunch: updated.lunch,
        dinner: updated.dinner,
        tea: updated.tea,
        cutFruits: updated.cutFruits,
        gymDiet: updated.gymDiet,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
