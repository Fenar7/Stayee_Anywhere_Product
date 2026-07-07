import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);
    const body = await request.json();
    const { amountPaise, reason } = body;

    if (!amountPaise || amountPaise <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // 1. Get Active Stay
    const stay = await prisma.stay.findFirst({
      where: {
        tenantId: session.user.id,
        status: { in: ["ACTIVE", "EXTENDED"] },
      },
      orderBy: { joiningDate: "desc" },
    });

    if (!stay) {
      throw new NotFoundError("No active stay found");
    }

    if (stay.foodBillingMode === "FLAT_RATE") {
      return NextResponse.json(
        { error: "Flat rate plans do not support wallet top-ups" },
        { status: 403 }
      );
    }

    // 2. Get Open Cycle
    const cycle = await prisma.foodBillingCycle.findFirst({
      where: { stayId: stay.id, status: "OPEN" },
      orderBy: { cycleStart: "desc" },
    });

    if (!cycle) {
      return NextResponse.json(
        { error: "No open billing cycle found" },
        { status: 403 }
      );
    }

    // 3. Check for existing PENDING request to prevent spam
    const existingPending = await prisma.foodWalletTopUp.findFirst({
      where: {
        stayId: stay.id,
        cycleId: cycle.id,
        status: "PENDING",
      }
    });

    if (existingPending) {
      return NextResponse.json(
        { error: "You already have a pending top-up request. Please wait for the warden to approve it before submitting another." },
        { status: 409 }
      );
    }

    // 4. Create the TopUp request
    const topUp = await prisma.foodWalletTopUp.create({
      data: {
        stayId: stay.id,
        cycleId: cycle.id,
        amountPaise,
        reason,
        requestedByTenantUserId: session.user.id,
        status: "PENDING",
      }
    });

    // TODO: Send notification to Warden (via notification service once implemented)
    // For now, it will appear in the warden's pending list.

    return NextResponse.json(topUp);
  } catch (error) {
    return handleApiError(error);
  }
}
