import { prisma } from "@/lib/db";
import { paiseToRupees, formatRupees } from "@/lib/money";
import { uploadToStorage } from "@/lib/storage";
import { renderPaymentReceipt } from "@/lib/pdf/render";
import { generateReceiptNumber } from "@/lib/pdf/templates/payment-receipt";
import type { ReceiptData } from "@/lib/pdf/templates/payment-receipt";
import { DocumentType, DocumentOwnerType, PaymentStatus } from "@prisma/client";

export interface GenerateReceiptResult {
  documentId: string;
  storagePath: string;
}

/**
 * Generate a payment receipt PDF for a verified payment.
 * Fetches all required data, renders the PDF, uploads to storage,
 * and creates a Document record.
 *
 * This function is designed to be called AFTER payment verification
 * succeeds. It should not be called inside the verification transaction
 * — failures here should not roll back the payment.
 */
export async function generatePaymentReceipt(
  paymentId: string
): Promise<GenerateReceiptResult> {
  // Fetch payment with all related data
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      stay: {
        include: {
          tenant: true,
          bed: {
            include: { room: true },
          },
          hostel: true,
        },
      },
      verifiedByUser: true,
    },
  });

  if (!payment) {
    throw new Error(`Payment not found: ${paymentId}`);
  }

  if (payment.paymentStatus !== PaymentStatus.PAID) {
    throw new Error(`Payment ${paymentId} is not verified (status: ${payment.paymentStatus})`);
  }

  const stay = payment.stay;
  const tenant = stay.tenant;
  const bed = stay.bed;
  const room = bed.room;
  const hostel = stay.hostel;

  // Build receipt data
  const receiptData: ReceiptData = {
    receiptNumber: `NH-${payment.createdAt.getFullYear()}-${payment.receiptNumber.toString().padStart(6, "0")}`,
    generatedAt: new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    }),
    hostelName: hostel.name,
    tenant: {
      fullName: tenant.fullName,
      roomNumber: room.roomNumber,
      bedLabel: bed.label,
      durationType: stay.durationType,
    },
    transaction: {
      amountPaise: payment.amountPaidPaise,
      amountFormatted: formatRupees(payment.amountPaidPaise),
      paymentMode: payment.paymentMode,
      transactionRefNo: payment.transactionRefNo,
      verifiedAt: payment.verifiedAt
        ? payment.verifiedAt.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "N/A",
      verifiedByName: payment.verifiedByUser?.email ?? payment.verifiedByUser?.id ?? "System",
    },
  };

  // Render PDF to buffer
  const pdfBuffer = await renderPaymentReceipt(receiptData);

  // Upload to Supabase storage
  const storagePath = `receipts/receipt_${paymentId}.pdf`;
  await uploadToStorage(pdfBuffer, storagePath, "application/pdf");

  // Create Document record
  const document = await prisma.document.create({
    data: {
      ownerType: DocumentOwnerType.STAY,
      stayId: stay.id,
      documentType: DocumentType.RECEIPT_PDF,
      storagePath,
      fileSizeBytes: pdfBuffer.length,
      uploadedByUserId: payment.verifiedByUserId ?? "system",
    },
  });

  return {
    documentId: document.id,
    storagePath,
  };
}
