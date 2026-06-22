import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError, ValidationError, ConflictError } from "@/lib/errors";
import { UserRole, StayStatus, PaymentStatus, BedStatus } from "@prisma/client";
import { generatePaymentReceipt } from "@/services/pdf/receipt.service";

const verifySchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID format"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { id: stayId } = await params;

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid body");
    }
    const { paymentId } = parsed.data;

    // Fetch the Stay, Payment and Bed details
    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
      include: {
        payments: true,
      },
    });

    if (!stay) {
      throw new NotFoundError("Stay record not found");
    }

    const hostelId = await resolveHostelId(session, request, stay.hostelId);

    if (stay.hostelId !== hostelId) {
      throw new ForbiddenError("You are not authorized to verify payment for this stay");
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundError("Payment record not found");
    }

    if (payment.stayId !== stayId) {
      throw new ValidationError("Payment does not belong to this stay");
    }

    if (payment.paymentStatus !== PaymentStatus.PENDING) {
      throw new ValidationError("Payment has already been processed");
    }

    // 1. Bed conflict check AT THE MOMENT OF ACTIVATION
    // Find any ACTIVE or EXTENDED stays overlapping the stay dates on the same bed
    const overlappingStay = await prisma.stay.findFirst({
      where: {
        bedId: stay.bedId,
        id: { not: stay.id }, // Exclude current stay
        status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
        joiningDate: { lte: stay.endDate },
        endDate: { gte: stay.joiningDate },
      },
    });

    if (overlappingStay) {
      throw new ConflictError(
        "Cannot activate stay. The bed has been booked by another active/extended resident for this date range."
      );
    }

    // Calculate verified payment aggregates
    const alreadyVerifiedSum = stay.payments
      .filter((p) => p.id !== paymentId && p.paymentStatus === PaymentStatus.PAID)
      .reduce((sum, p) => sum + p.amountPaidPaise, 0);

    const totalVerifiedWithCurrent = alreadyVerifiedSum + payment.amountPaidPaise;

    await prisma.$transaction(async (tx) => {
      if (totalVerifiedWithCurrent >= stay.totalPayablePaise) {
        // Fully paid -> Transition Stay to ACTIVE, verify payment as PAID, Bed to OCCUPIED
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            verifiedByUserId: session.user.id,
            verifiedAt: new Date(),
          },
        });

        const originalStatus = stay.status;

        await tx.stay.update({
          where: { id: stayId },
          data: {
            status: StayStatus.ACTIVE,
          },
        });

        // Record StayStatusEvent
        await tx.stayStatusEvent.create({
          data: {
            stayId,
            fromStatus: originalStatus,
            toStatus: StayStatus.ACTIVE,
            changedByUserId: session.user.id,
            note: "Payment fully verified. Stay activated.",
          },
        });

        // Update Bed status to OCCUPIED
        await tx.bed.update({
          where: { id: stay.bedId },
          data: {
            status: BedStatus.OCCUPIED,
          },
        });
      } else {
        // Partially paid -> Set payment to PARTIALLY_PAID, Stay status remains APPROVED_AWAITING_PAYMENT
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            paymentStatus: PaymentStatus.PARTIALLY_PAID,
            verifiedByUserId: session.user.id,
            verifiedAt: new Date(),
          },
        });

        // If some other payment is already verified but overall is still partial, we don't activate yet.
      }
    });

    // Auto-trigger receipt generation asynchronously (fire-and-forget).
    // Failures here must NOT roll back the payment verification.
    const activated = totalVerifiedWithCurrent >= stay.totalPayablePaise;
    if (activated) {
      generatePaymentReceipt(paymentId).catch((err) => {
        console.error(`[Receipt] Failed to generate receipt for payment ${paymentId}:`, err);
      });
    }

    return NextResponse.json({
      success: true,
      activated,
      message: activated
        ? "Payment verified. Stay is now ACTIVE."
        : "Partial payment verified. Additional payment required to activate stay.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
