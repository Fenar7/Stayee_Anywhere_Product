import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { UserRole, TopUpStatus, PaymentMode } from "@prisma/client";
import { z } from "zod";
import { logActivity } from "@/services/activity/activity.service";
import { ActivityEventType } from "@prisma/client";

const postSchema = z.object({
  stayId: z.string(),
  amountPaise: z.number().int().positive(),
  paymentMode: z.nativeEnum(PaymentMode),
  transactionRef: z.string().optional(),
  reason: z.string().optional(),
  idempotencyKey: z.string(),
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
      include: { tenant: true, hostel: true },
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

    const { topUp, isNew } = await prisma.$transaction(
      async (tx) => {
        const exactDuplicate = await tx.foodWalletTopUp.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
        });

        if (exactDuplicate) {
          if (exactDuplicate.stayId !== stay.id) {
            throw new Error("IDEMPOTENCY_CONFLICT");
          }
          return { topUp: exactDuplicate, isNew: false };
        }

        const newTopUp = await tx.foodWalletTopUp.create({
          data: {
            stayId: stay.id,
            cycleId: activeCycle.id,
            amountPaise: data.amountPaise,
            paymentMode: data.paymentMode,
            transactionRef: data.transactionRef,
            reason: data.reason,
            status: TopUpStatus.APPROVED, // Direct top-ups by warden are pre-approved
            approvedByUserId: session.user.id,
            idempotencyKey: data.idempotencyKey,
          },
        });
        
        return { topUp: newTopUp, isNew: true };
      },
      { isolationLevel: "Serializable" }
    );

    if (isNew) {
      const actorName = session.user.email || session.user.phone || (session.user.role === UserRole.MAIN_ADMIN ? "Admin" : "Warden");
      await logActivity({
        organizationId: stay.hostel.organizationId,
        hostelId: stay.hostelId,
        eventType: ActivityEventType.FOOD_WALLET_TOPPED_UP,
        actorId: session.user.id,
        actorName: actorName,
        subjectId: stay.id,
        subjectName: stay.tenant.fullName,
        subjectType: "Stay",
        metadata: { amountPaise: topUp.amountPaise },
      });
    }

    return NextResponse.json(topUp);
  } catch (error: any) {
    if (error.message === "IDEMPOTENCY_CONFLICT") {
      return NextResponse.json(
        { error: "Idempotency key conflict." },
        { status: 409 }
      );
    }
    return handleApiError(error);
  }
}
