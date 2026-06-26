import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, ValidationError } from "@/lib/errors";
import { isPastFoodCutoff } from "@/lib/dates/food-cutoff";
import { UserRole, StayStatus } from "@prisma/client";

/**
 * GET /api/warden/food-stats?date=YYYY-MM-DD
 *
 * Returns consolidated food stats for a hostel on a given date:
 * - Aggregate counts for breakfast, lunch, dinner
 * - Per-resident checklist with meal selections
 * - Locking status (OPEN or LOCKED/FINALIZED based on 10 PM IST cutoff)
 *
 * Access: WARDEN or MAIN_ADMIN (via resolveHostelId)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const hostelId = await resolveHostelId(session, request);

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      throw new ValidationError("date query parameter is required (YYYY-MM-DD)");
    }

    // Parse the target date in IST
    const targetDate = new Date(`${dateStr}T00:00:00.000+05:30`);
    if (isNaN(targetDate.getTime())) {
      throw new ValidationError("Invalid date format. Use YYYY-MM-DD");
    }

    // Check locking status
    const isLocked = isPastFoodCutoff(targetDate);

    // Fetch all active/extended stays in this hostel
    const activeStays = await prisma.stay.findMany({
      where: {
        hostelId,
        status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
      },
      include: {
        tenant: {
          select: {
            id: true,
            fullName: true,
            photoUrl: true,
          },
        },
        bed: {
          select: {
            label: true,
            room: {
              select: { roomNumber: true },
            },
          },
        },
        foodOrders: {
          where: {
            forDate: targetDate,
          },
          select: {
            breakfast: true,
            lunch: true,
            dinner: true,
            confirmedAt: true,
            lockedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build resident-by-resident checklist
    let breakfastCount = 0;
    let lunchCount = 0;
    let dinnerCount = 0;

    const residents = activeStays.map((stay) => {
      const order = stay.foodOrders[0];
      const breakfast = order?.breakfast ?? false;
      const lunch = order?.lunch ?? false;
      const dinner = order?.dinner ?? false;

      if (breakfast) breakfastCount++;
      if (lunch) lunchCount++;
      if (dinner) dinnerCount++;

      return {
        stayId: stay.id,
        tenantName: stay.tenant.fullName,
        tenantPhotoUrl: stay.tenant.photoUrl,
        roomNumber: stay.bed.room.roomNumber,
        bedLabel: stay.bed.label,
        foodPlan: stay.foodPlan,
        breakfast,
        lunch,
        dinner,
        hasOrder: !!order,
        confirmedAt: order?.confirmedAt?.toISOString() ?? null,
        lockedAt: order?.lockedAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({
      date: dateStr,
      hostelId,
      lockingStatus: isLocked ? "LOCKED" : "OPEN",
      summary: {
        totalResidents: activeStays.length,
        breakfastCount,
        lunchCount,
        dinnerCount,
      },
      residents,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
