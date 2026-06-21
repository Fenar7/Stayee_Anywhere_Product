import { prisma } from "@/lib/db";
import { formatRupees } from "@/lib/money";
import { uploadToStorage } from "@/lib/storage";
import { renderRefundInvoice } from "@/lib/pdf/render";
import type { RefundInvoiceData } from "@/lib/pdf/templates/refund-invoice";
import { DocumentType, DocumentOwnerType } from "@prisma/client";

export interface GenerateRefundInvoiceResult {
  documentId: string;
  storagePath: string;
}

/**
 * Generate a Refund Invoice PDF for an early checkout refund.
 */
export async function generateRefundInvoice(
  refundInvoiceId: string
): Promise<GenerateRefundInvoiceResult> {
  const refund = await prisma.refundInvoice.findUnique({
    where: { id: refundInvoiceId },
    include: {
      stay: {
        include: {
          hostel: true,
        },
      },
      processedByUser: true,
    },
  });

  if (!refund) throw new Error(`Refund invoice not found: ${refundInvoiceId}`);

  const data: RefundInvoiceData = {
    hostelName: refund.stay.hostel.name,
    invoiceDate: refund.createdAt.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    }),
    stayId: refund.stayId,
    originalAmountPaise: refund.originalAmountPaise,
    originalAmountFormatted: formatRupees(refund.originalAmountPaise),
    daysUsed: refund.daysUsed,
    daysRemaining: refund.daysRemaining,
    refundAmountPaise: refund.refundAmountPaise,
    refundAmountFormatted: formatRupees(refund.refundAmountPaise),
    processedByName: refund.processedByUser?.email ?? refund.processedByUser?.id ?? "System",
    notes: refund.notes,
  };

  const pdfBuffer = await renderRefundInvoice(data);

  const storagePath = `refund_invoices/refund_${refundInvoiceId}.pdf`;
  await uploadToStorage(pdfBuffer, storagePath, "application/pdf");

  const document = await prisma.document.create({
    data: {
      ownerType: DocumentOwnerType.STAY,
      stayId: refund.stayId,
      documentType: DocumentType.REFUND_INVOICE_PDF,
      storagePath,
      fileSizeBytes: pdfBuffer.length,
      uploadedByUserId: refund.processedByUserId,
    },
  });

  // Update the RefundInvoice record to link to the PDF document
  await prisma.refundInvoice.update({
    where: { id: refundInvoiceId },
    data: { pdfDocumentId: document.id },
  });

  return {
    documentId: document.id,
    storagePath,
  };
}
