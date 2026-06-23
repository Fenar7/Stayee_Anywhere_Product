import { prisma } from "@/lib/db";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { PaymentMode, PaymentStatus, StayStatus, BedStatus } from "@prisma/client";
import { checkBedConflict } from "@/services/beds/bed.service";
import { generatePaymentReceipt } from "@/services/pdf/receipt.service";

export interface RecordPaymentInput {
  stayId: string;
  amountPaid: number;
  paymentMode: PaymentMode;
  transactionRefNo?: string | null;
  receivedBy?: string | null;
  screenshotDocId?: string | null;
}

export async function calculateBalance(stayId: string): Promise<{ totalPayable: number; totalPaid: number; balance: number }> {
  const stay = await prisma.stay.findUnique({
    where: { id: stayId },
    include: { payments: true },
  });

  if (!stay) {
    throw new NotFoundError("Stay record not found");
  }

  const totalPaidPaise = stay.payments
    .filter((p) => p.paymentStatus === PaymentStatus.PAID)
    .reduce((sum, p) => sum + p.amountPaidPaise, 0);

  const balancePaise = stay.totalPayablePaise - totalPaidPaise;

  return {
    totalPayable: stay.totalPayablePaise / 100,
    totalPaid: totalPaidPaise / 100,
    balance: balancePaise / 100,
  };
}

export async function recordPayment(input: RecordPaymentInput) {
  const stay = await prisma.stay.findUnique({
    where: { id: input.stayId },
  });

  if (!stay) {
    throw new NotFoundError("Stay record not found");
  }

  if (stay.status !== StayStatus.APPROVED_AWAITING_PAYMENT) {
    throw new ValidationError(`Cannot record payment for stay in status: ${stay.status}`);
  }

  const amountPaidPaise = Math.round(input.amountPaid * 100);

  if (
    (input.paymentMode === PaymentMode.UPI || input.paymentMode === PaymentMode.BANK_TRANSFER) &&
    !input.transactionRefNo?.trim()
  ) {
    throw new ValidationError("Transaction reference number is required for UPI or Bank Transfer payments");
  }

  return prisma.payment.create({
    data: {
      stayId: input.stayId,
      amountPaidPaise,
      paymentMode: input.paymentMode,
      transactionRefNo: input.transactionRefNo || null,
      receivedBy: input.receivedBy || "System",
      paymentStatus: PaymentStatus.PENDING,
      screenshotDocumentId: input.screenshotDocId,
    },
  });
}

export async function verifyPayment(paymentId: string, verifiedByUserId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { stay: { include: { payments: true } } },
  });

  if (!payment) {
    throw new NotFoundError("Payment record not found");
  }

  const stay = payment.stay;

  if (payment.paymentStatus !== PaymentStatus.PENDING) {
    throw new ValidationError("Payment has already been processed");
  }

  // Bed conflict check
  const hasConflict = await checkBedConflict(stay.bedId, stay.joiningDate, stay.endDate, stay.id);
  if (hasConflict) {
    throw new ConflictError(
      "Cannot activate stay. The bed has been booked by another active/extended resident for this date range."
    );
  }

  const alreadyVerifiedSum = stay.payments
    .filter((p) => p.id !== paymentId && p.paymentStatus === PaymentStatus.PAID)
    .reduce((sum, p) => sum + p.amountPaidPaise, 0);

  const totalVerifiedWithCurrent = alreadyVerifiedSum + payment.amountPaidPaise;
  const isFullyPaid = totalVerifiedWithCurrent >= stay.totalPayablePaise;

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: isFullyPaid ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID,
        verifiedByUserId,
        verifiedAt: new Date(),
      },
    });

    let updatedStay = stay;

    if (isFullyPaid) {
      const originalStatus = stay.status;

      updatedStay = await tx.stay.update({
        where: { id: stay.id },
        data: {
          status: StayStatus.ACTIVE,
        },
        include: { payments: true },
      });

      await tx.stayStatusEvent.create({
        data: {
          stayId: stay.id,
          fromStatus: originalStatus,
          toStatus: StayStatus.ACTIVE,
          changedByUserId: verifiedByUserId,
          note: "Payment fully verified. Stay activated.",
        },
      });

      await tx.bed.update({
        where: { id: stay.bedId },
        data: {
          status: BedStatus.OCCUPIED,
        },
      });
    }

    return { payment: updatedPayment, stay: updatedStay, activated: isFullyPaid };
  });

  if (result.activated) {
    generatePaymentReceipt(paymentId).catch((err) => {
      console.error(`[Receipt] Failed to generate receipt for payment ${paymentId}:`, err);
    });
  }

  return { payment: result.payment, stay: result.stay };
}
