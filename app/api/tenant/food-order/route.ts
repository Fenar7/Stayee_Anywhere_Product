import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);
    const body = await request.json();
    const { breakfast, lunch, dinner } = body;

    // 1. Get Active Stay
    const stay = await prisma.stay.findFirst({
      where: {
        tenantId: session.user.id,
        status: { in: ["ACTIVE", "EXTENDED"] },
      },
      include: { hostel: true },
      orderBy: { joiningDate: "desc" },
    });

    if (!stay) {
      throw new NotFoundError("No active stay found");
    }

    // 2. Enforce Cutoff Window logic
    const { foodOrderCutoffStartHour, foodOrderCutoffEndHour } = stay.hostel;
    
    // Convert current UTC time to IST (UTC + 5:30)
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + istOffsetMs);
    const currentHourIST = nowIST.getUTCHours(); // Note: getUTCHours of the shifted date gives us the local IST hour

    const isOvernight = foodOrderCutoffStartHour > foodOrderCutoffEndHour;
    let isWindowOpen = false;

    if (isOvernight) {
      isWindowOpen = currentHourIST >= foodOrderCutoffStartHour || currentHourIST < foodOrderCutoffEndHour;
    } else {
      isWindowOpen = currentHourIST >= foodOrderCutoffStartHour && currentHourIST < foodOrderCutoffEndHour;
    }

    let forDateIST: Date;

    if (isWindowOpen) {
      if (currentHourIST >= foodOrderCutoffStartHour) {
        forDateIST = new Date(nowIST);
        forDateIST.setUTCDate(forDateIST.getUTCDate() + 1);
      } else {
        forDateIST = new Date(nowIST);
      }
    } else {
      // Outside window
      const formattedStart = `${foodOrderCutoffStartHour > 12 ? foodOrderCutoffStartHour - 12 : foodOrderCutoffStartHour}:00 ${foodOrderCutoffStartHour >= 12 ? 'PM' : 'AM'}`;
      const formattedEnd = `${foodOrderCutoffEndHour > 12 ? foodOrderCutoffEndHour - 12 : foodOrderCutoffEndHour}:00 ${foodOrderCutoffEndHour >= 12 ? 'PM' : 'AM'}`;
      return NextResponse.json(
        { error: `Food orders are only accepted between ${formattedStart} and ${formattedEnd}. Please try again at ${formattedStart}.` },
        { status: 403 }
      );
    }

    // Normalize forDate to midnight IST, then store as UTC
    // For example, 2026-07-08T00:00:00.000+05:30 -> stored as 2026-07-07T18:30:00.000Z
    forDateIST.setUTCHours(0, 0, 0, 0);
    const dbForDateUTC = new Date(forDateIST.getTime() - istOffsetMs);

    // 3. Check if cycle is closed or order is locked
    const existingOrder = await prisma.foodOrder.findUnique({
      where: {
        stayId_forDate: {
          stayId: stay.id,
          forDate: dbForDateUTC,
        }
      }
    });

    if (existingOrder && existingOrder.lockedAt) {
      const formattedDate = forDateIST.toISOString().split("T")[0];
      return NextResponse.json(
        { error: `Your order for ${formattedDate} is already locked and cannot be modified.` },
        { status: 409 }
      );
    }

    // Determine cycle constraints
    const cycle = await prisma.foodBillingCycle.findFirst({
      where: { stayId: stay.id, status: "OPEN" },
      orderBy: { cycleStart: "desc" },
    });
    
    // Even if cycle is missing/closed, if flat rate, we allow it. But we should check if consumption-based.
    if (!cycle && stay.foodBillingMode !== "FLAT_RATE") {
       return NextResponse.json(
        { error: "No open billing cycle found. Cannot place orders." },
        { status: 403 }
      );
    }

    // Ensure order is not for a date before the cycle
    if (cycle && dbForDateUTC < cycle.cycleStart) {
      return NextResponse.json(
        { error: "Cannot modify orders for past billing cycles." },
        { status: 403 }
      );
    }

    // 4. Save/Update Order
    const order = await prisma.foodOrder.upsert({
      where: {
        stayId_forDate: {
          stayId: stay.id,
          forDate: dbForDateUTC,
        },
      },
      update: {
        breakfast: typeof breakfast === 'boolean' ? breakfast : undefined,
        lunch: typeof lunch === 'boolean' ? lunch : undefined,
        dinner: typeof dinner === 'boolean' ? dinner : undefined,
      },
      create: {
        stayId: stay.id,
        forDate: dbForDateUTC,
        breakfast: breakfast ?? false,
        lunch: lunch ?? false,
        dinner: dinner ?? false,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    return handleApiError(error);
  }
}
