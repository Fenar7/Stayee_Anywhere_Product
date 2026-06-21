import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  handleApiError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/lib/errors";
import { UserRole, StayStatus, BedStatus, DocumentOwnerType, DocumentType } from "@prisma/client";

const earlyCheckoutSchema = z.object({
  checkoutDate: z.string().transform((val) => new Date(val)),
  refundAmount: z.number().nonnegative(),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const warden = session.user.warden!;
    const hostelId = warden.hostelId;

    const { id: stayId } = await params;

    const body = await request.json();
    const parsed = earlyCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid body");
    }
    const { checkoutDate, refundAmount, notes } = parsed.data;

    if (refundAmount > 100000) {
      throw new ValidationError("Refund amount exceeds maximum transaction limit of ₹1,00,000");
    }

    // Fetch stay
    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
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

    // Verify checkoutDate is between joiningDate and endDate
    if (checkoutDate.getTime() < stay.joiningDate.getTime() || checkoutDate.getTime() >= stay.endDate.getTime()) {
      throw new ValidationError("Checkout date must be between joining date and scheduled check-out date");
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (checkoutDate.getTime() > today.getTime()) {
      throw new ValidationError("Checkout date cannot be in the future");
    }

    // Calculate days
    const msPerDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.max(1, Math.round((stay.endDate.getTime() - stay.joiningDate.getTime()) / msPerDay));
    const daysUsed = Math.max(0, Math.round((checkoutDate.getTime() - stay.joiningDate.getTime()) / msPerDay));
    const daysRemaining = Math.max(0, totalDays - daysUsed);

    const refundAmountPaise = Math.round(refundAmount * 100);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create dummy Document record for PDF mapping
      const doc = await tx.document.create({
        data: {
          ownerType: DocumentOwnerType.STAY,
          stayId,
          documentType: DocumentType.REFUND_INVOICE_PDF,
          storagePath: `refund_invoices/placeholder_${stayId}_${Date.now()}.pdf`,
          fileSizeBytes: 0,
          uploadedByUserId: session.user.id,
        },
      });

      // 2. Create RefundInvoice
      const refundInvoice = await tx.refundInvoice.create({
        data: {
          stayId,
          originalAmountPaise: stay.totalPayablePaise,
          daysUsed,
          daysRemaining,
          refundAmountPaise,
          processedByUserId: session.user.id,
          notes: notes || null,
          pdfDocumentId: doc.id,
        },
      });

      // 3. Update Stay status & endDate
      await tx.stay.update({
        where: { id: stayId },
        data: {
          status: StayStatus.EARLY_EXIT,
          endDate: checkoutDate,
        },
      });

      // 4. Update Bed status to AVAILABLE
      await tx.bed.update({
        where: { id: stay.bedId },
        data: {
          status: BedStatus.AVAILABLE,
        },
      });

      // 5. Delete future FoodOrders
      await tx.foodOrder.deleteMany({
        where: {
          stayId,
          forDate: { gt: checkoutDate },
        },
      });

      // 6. Log status event
      await tx.stayStatusEvent.create({
        data: {
          stayId,
          fromStatus: stay.status,
          toStatus: StayStatus.EARLY_EXIT,
          changedByUserId: session.user.id,
          note: `Early checkout processed. Checkout date: ${checkoutDate.toISOString().split("T")[0]}. Refund: ₹${refundAmount}`,
        },
      });

      return refundInvoice;
    });

    return NextResponse.json({
      success: true,
      refundInvoiceId: result.id,
      message: "Early checkout processed successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
