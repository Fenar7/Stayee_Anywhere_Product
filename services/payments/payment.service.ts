import { prisma } from "@/lib/db";
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from "@/lib/errors";
import { PaymentMode, PaymentStatus, StayStatus, BedStatus } from "@prisma/client";
import { checkBedConflict } from "@/services/beds/bed.service";
import { generatePaymentReceipt } from "@/services/pdf/receipt.service";
import { logActivity } from "@/services/activity/activity.service";
import { ActivityEventType } from "@prisma/client";

import { verifyAndGetFileType, compressImage } from "@/lib/image";
import { uploadToStorage } from "@/lib/storage";
import { DocumentType, DocumentOwnerType } from "@prisma/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

export interface RecordPaymentInput {
  stayId: string;
  amountPaid: number;
  paymentMode: PaymentMode;
  transactionRefNo?: string | null;
  receivedBy?: string | null;
  screenshotFile?: File | null;
  uploadedByUserId: string;
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
    include: { hostel: true, tenant: { include: { user: true } } }
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

  let screenshotDocId: string | null = null;

  if (input.screenshotFile && typeof input.screenshotFile !== "string" && typeof input.screenshotFile.arrayBuffer === "function") {
    const buffer = Buffer.from(await input.screenshotFile.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      throw new ValidationError("Screenshot file must be smaller than 5MB");
    }

    const fileType = verifyAndGetFileType(buffer);
    if (fileType !== "jpg" && fileType !== "png") {
      throw new ValidationError("Screenshot must be a JPEG or PNG image");
    }

    const compressed = await compressImage(buffer, "document");
    const screenshotPath = `tenants/${stay.tenantId}/payment_screenshot_${Date.now()}.jpg`;
    await uploadToStorage(compressed.data, screenshotPath, compressed.mimeType);

    const doc = await prisma.document.create({
      data: {
        ownerType: DocumentOwnerType.STAY,
        stayId: stay.id,
        documentType: DocumentType.PAYMENT_SCREENSHOT,
        storagePath: screenshotPath,
        fileSizeBytes: compressed.data.length,
        uploadedByUserId: input.uploadedByUserId,
      },
    });
    screenshotDocId = doc.id;
  }

  const payment = await prisma.payment.create({
    data: {
      stayId: input.stayId,
      amountPaidPaise,
      paymentMode: input.paymentMode,
      transactionRefNo: input.transactionRefNo || null,
      receivedBy: input.receivedBy || "System",
      paymentStatus: PaymentStatus.PENDING,
      screenshotDocumentId: screenshotDocId,
    },
  });

  void logActivity({
    organizationId: stay.hostel.organizationId,
    hostelId: stay.hostelId,
    eventType: ActivityEventType.TENANT_PAYMENT_RECEIVED,
    actorId: input.uploadedByUserId,
    actorName: stay.tenant.fullName ?? "Tenant",
    subjectName: `Payment of ₹${input.amountPaid}`,
    subjectId: payment.id,
    subjectType: "Payment",
    targetUrl: `/warden/onboards/${stay.id}`,
  });

  return payment;
}

export async function verifyPayment(
  paymentId: string, 
  verifiedByUserId: string, 
  authorizedHostelId: string, 
  userRole: string
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { stay: { include: { hostel: true, tenant: true } } },
  });

  if (!payment) {
    throw new NotFoundError("Payment record not found");
  }

  const stay = payment.stay;

  if (userRole !== "MAIN_ADMIN" && stay.hostelId !== authorizedHostelId) {
    throw new ForbiddenError("You are not authorized to verify payment for this stay");
  }

  if (payment.paymentStatus !== PaymentStatus.PENDING) {
    throw new ValidationError("Payment has already been processed");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Bed conflict check inside transaction
    const activeStaysOnBed = await tx.stay.findMany({
      where: {
        bedId: stay.bedId,
        id: { not: stay.id },
        status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
      },
      select: { joiningDate: true, endDate: true },
    });

    const targetStart = stay.joiningDate.getTime();
    const targetEnd = stay.endDate ? stay.endDate.getTime() : null;

    const hasOverlap = activeStaysOnBed.some((other) => {
      const otherStart = new Date(other.joiningDate).getTime();
      const otherEnd = other.endDate ? new Date(other.endDate).getTime() : null;

      if (otherEnd !== null && otherEnd < targetStart) return false;
      if (targetEnd !== null && otherStart > targetEnd) return false;
      return true;
    });

    if (hasOverlap) {
      throw new ConflictError(
        "Cannot activate stay. The bed has been booked by another active/extended resident for this date range."
      );
    }

    const currentPayments = await tx.payment.findMany({
      where: { stayId: stay.id },
    });

    const alreadyVerifiedSum = currentPayments
      .filter((p) => p.id !== paymentId && p.paymentStatus === PaymentStatus.PAID)
      .reduce((sum, p) => sum + p.amountPaidPaise, 0);

    const totalVerifiedWithCurrent = alreadyVerifiedSum + payment.amountPaidPaise;
    const isFullyPaid = totalVerifiedWithCurrent >= stay.totalPayablePaise;

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
        include: { tenant: true, hostel: true },
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

    void logActivity({
      organizationId: stay.hostel.organizationId,
      hostelId: stay.hostelId,
      eventType: ActivityEventType.TENANT_ONBOARDED,
      actorId: verifiedByUserId,
      actorName: "Warden",
      subjectName: stay.tenant.fullName ?? "Tenant",
      subjectId: stay.id,
      subjectType: "Stay",
      targetUrl: `/warden/onboards/${stay.id}`,
    });
  }

  return { payment: result.payment, stay: result.stay };
}
