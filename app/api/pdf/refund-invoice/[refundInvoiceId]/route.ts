import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { generateRefundInvoice } from "@/services/pdf/refund-invoice.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ refundInvoiceId: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { refundInvoiceId } = await params;

    // Fetch refund invoice with stay for authorization
    const refund = await prisma.refundInvoice.findUnique({
      where: { id: refundInvoiceId },
      select: { stay: { select: { hostelId: true } } },
    });

    if (!refund) {
      throw new NotFoundError("Refund invoice not found");
    }

    // Authorization: WARDEN must manage this hostel
    if (session.user.role === UserRole.WARDEN) {
      if (!session.user.warden || session.user.warden.hostelId !== refund.stay.hostelId) {
        throw new ForbiddenError("You are not authorized to generate refund invoices for this stay");
      }
    }
    // MAIN_ADMIN bypasses

    const result = await generateRefundInvoice(refundInvoiceId);

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      storagePath: result.storagePath,
      message: "Refund invoice generated successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
