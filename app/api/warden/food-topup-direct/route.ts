import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { UserRole, TopUpStatus, PaymentMode } from "@prisma/client";
import { z } from "zod";

const postSchema = z.object({
  stayId: z.string(),
  amountPaise: z.number().int().positive(),
  paymentMode: z.nativeEnum(PaymentMode),
  transactionRef: z.string().optional(),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const hostelId = await resolveHostelId(session, request);
    await requireHostelAccess(session, hostelId);

    const body = await request.json();
    const data = postSchema.parse(body);

    const stay = await prisma.stay.findUnique({
      where: { id: data.stayId },
    });

    if (!stay || stay.hostelId !== hostelId) {
      throw new NotFoundError("Stay not found");
    }

    // Find active OPEN cycle for the stay
    const activeCycle = await prisma.foodBillingCycle.findFirst({
      where: { stayId: stay.id, status: "OPEN" },
      orderBy: { cycleStart: "desc" },
    });

    if (!activeCycle) {
      throw new ValidationError("No open billing cycle found for this tenant. Cannot record top-up.");
    }

    const topUp = await prisma.foodWalletTopUp.create({
      data: {
        stayId: stay.id,
        cycleId: activeCycle.id,
        amountPaise: data.amountPaise,
        paymentMode: data.paymentMode,
        transactionRef: data.transactionRef,
        reason: data.reason,
        status: TopUpStatus.APPROVED, // Direct top-ups by warden are pre-approved
        approvedByUserId: session.user.id,
      },
    });

    return NextResponse.json(topUp);
  } catch (error) {
    return handleApiError(error);
  }
}
