import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { UserRole, Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);
    const body = await request.json();
    const { amountPaise, reason, idempotencyKey } = body;

    if (!amountPaise || typeof amountPaise !== "number" || amountPaise <= 0) {
      return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
    }

    if (!idempotencyKey || typeof idempotencyKey !== "string") {
      return NextResponse.json({ error: "Missing idempotency key." }, { status: 400 });
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

    // 3. Create the TopUp request securely using a Serializable transaction
    // This prevents race conditions where rapid double-clicks bypass the PENDING check
    try {
      const topUp = await prisma.$transaction(
        async (tx) => {
          // 3a. Check for strict idempotency key match first
          const exactDuplicate = await tx.foodWalletTopUp.findUnique({
            where: { idempotencyKey },
          });

          if (exactDuplicate) {
            return exactDuplicate; // Safely return the existing request (success)
          }

          // 3b. Check if they already have a different pending request for this cycle
          const existingPending = await tx.foodWalletTopUp.findFirst({
            where: {
              stayId: stay.id,
              cycleId: cycle.id,
              status: "PENDING",
            },
          });

          if (existingPending) {
            throw new Error("ALREADY_PENDING");
          }

          return tx.foodWalletTopUp.create({
            data: {
              stayId: stay.id,
              cycleId: cycle.id,
              amountPaise,
              reason,
              requestedByTenantUserId: session.user.id,
              status: "PENDING",
              idempotencyKey,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      // TODO: Send notification to Warden (via notification service once implemented)
      // For now, it will appear in the warden's pending list.

      return NextResponse.json(topUp);
    } catch (e: any) {
      if (e.message === "ALREADY_PENDING") {
        return NextResponse.json(
          { error: "You already have a pending top-up request. Please wait for the warden to approve it before submitting another." },
          { status: 409 }
        );
      }
      throw e;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
