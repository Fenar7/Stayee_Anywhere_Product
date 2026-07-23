import { prisma } from "@/lib/db";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import { rupeesToPaise } from "@/lib/money";
import { diffInDays, isFutureDateIST } from "@/lib/dates";
import { StayStatus, BedStatus, DocumentOwnerType, DocumentType } from "@prisma/client";
import { generateRefundInvoice } from "@/services/pdf/refund-invoice.service";
import { logActivity } from "@/services/activity/activity.service";
import { ActivityEventType } from "@prisma/client";

export interface EarlyCheckoutParams {
  stayId: string;
  hostelId: string;
  checkoutDate: Date;
  refundAmountPaise: number;
  notes: string | undefined;
  userId: string;
}

export interface EarlyCheckoutResult {
  refundInvoiceId: string;
}

export async function processEarlyCheckout(params: EarlyCheckoutParams): Promise<EarlyCheckoutResult> {
  const { stayId, hostelId, checkoutDate, refundAmountPaise, notes, userId } = params;

  if (refundAmountPaise > 10000000) {
    throw new ValidationError("Refund amount exceeds maximum transaction limit of ₹1,00,000");
  }

  const stay = await prisma.stay.findUnique({ 
    where: { id: stayId },
    include: { payments: true, hostel: true, tenant: true }
  });

  if (!stay) {
    throw new NotFoundError("Stay record not found");
  }

  if (stay.hostelId !== hostelId) {
    throw new ForbiddenError("You are not authorized to modify this stay");
  }

  if (stay.status !== StayStatus.ACTIVE && stay.status !== StayStatus.EXTENDED) {
    throw new ValidationError("Stay must be ACTIVE or EXTENDED to process early checkout");
  }

  if (checkoutDate.getTime() < stay.joiningDate.getTime() || (stay.endDate && checkoutDate.getTime() >= stay.endDate.getTime())) {
    throw new ValidationError("Checkout date must be between joining date and scheduled check-out date");
  }

  if (isFutureDateIST(checkoutDate)) {
    throw new ValidationError("Checkout date cannot be in the future");
  }

  const effectiveEndDate = stay.endDate ?? new Date();
  const totalDays = Math.max(1, diffInDays(stay.joiningDate, effectiveEndDate));
  const daysUsed = Math.max(0, diffInDays(stay.joiningDate, checkoutDate));
  const daysRemaining = Math.max(0, totalDays - daysUsed);

  const totalPayments = stay.payments.reduce((acc, p) => p.paymentStatus === "PAID" ? acc + p.amountPaidPaise : acc, 0);
  if (refundAmountPaise > totalPayments) {
    throw new ValidationError(`Refund amount cannot exceed total payments received (₹${totalPayments / 100})`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        ownerType: DocumentOwnerType.STAY,
        stayId,
        documentType: DocumentType.REFUND_INVOICE_PDF,
        storagePath: `refund_invoices/placeholder_${stayId}_${Date.now()}.pdf`,
        fileSizeBytes: 0,
        uploadedByUserId: userId,
      },
    });

    const refundInvoice = await tx.refundInvoice.create({
      data: {
        stayId,
        originalAmountPaise: stay.totalPayablePaise,
        daysUsed,
        daysRemaining,
        refundAmountPaise,
        processedByUserId: userId,
        notes: notes || null,
        pdfDocumentId: doc.id,
      },
    });

    await tx.stay.update({
      where: { id: stayId },
      data: {
        status: StayStatus.EARLY_EXIT,
        endDate: checkoutDate,
      },
    });

    await tx.bed.update({
      where: { id: stay.bedId },
      data: { status: BedStatus.AVAILABLE },
    });

    await tx.foodOrder.deleteMany({
      where: {
        stayId,
        forDate: { gt: checkoutDate },
      },
    });

    await tx.stayStatusEvent.create({
      data: {
        stayId,
        fromStatus: stay.status,
        toStatus: StayStatus.EARLY_EXIT,
        changedByUserId: userId,
        note: `Early checkout processed. Checkout date: ${checkoutDate.toISOString().split("T")[0]}. Refund: ₹${refundAmountPaise / 100}`,
      },
    });

    return refundInvoice;
  });

  const refundInvoiceId = result.id;

  // Auto-trigger refund invoice PDF generation asynchronously.
  // Failures are logged but do NOT affect the checkout result.
  generateRefundInvoice(refundInvoiceId).catch((err) => {
    console.error(`[RefundInvoice] Failed to generate PDF for refund ${refundInvoiceId}:`, err);
  });

  void logActivity({
    organizationId: stay.hostel.organizationId,
    hostelId: stay.hostelId,
    eventType: ActivityEventType.TENANT_CHECKED_OUT,
    actorId: userId,
    actorName: "Warden",
    subjectName: stay.tenant.fullName ?? "Tenant",
    subjectId: stay.id,
    subjectType: "Stay",
    targetUrl: `/warden/onboards/${stay.id}`,
  });

  return { refundInvoiceId };
}
