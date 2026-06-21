import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  handleApiError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import { UserRole, PaymentStatus } from "@prisma/client";
import { generatePaymentReceipt } from "@/services/pdf/receipt.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.TENANT, UserRole.MAIN_ADMIN]);
    const { paymentId } = await params;

    // Fetch the payment and related stay/hostel for authorization
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        stay: {
          include: {
            hostel: true,
            tenant: { include: { user: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError("Payment record not found");
    }

    // Authorization check
    const user = session.user;

    if (user.role === UserRole.WARDEN) {
      // Warden must be assigned to the payment's stay's hostel
      if (!user.warden || user.warden.hostelId !== payment.stay.hostelId) {
        throw new ForbiddenError("You are not authorized to generate receipts for this payment");
      }
    } else if (user.role === UserRole.TENANT) {
      // Tenant must be the owner of the stay
      if (!user.tenant || user.tenant.id !== payment.stay.tenantId) {
        throw new ForbiddenError("You can only generate receipts for your own payments");
      }
    }
    // MAIN_ADMIN bypasses all checks

    if (payment.paymentStatus !== PaymentStatus.PAID) {
      return NextResponse.json(
        {
          error: "Payment must be verified (PAID) before generating a receipt",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Check if receipt already exists for this payment
    const existingDoc = await prisma.document.findFirst({
      where: {
        stayId: payment.stayId,
        documentType: "RECEIPT_PDF",
        storagePath: `receipts/receipt_${paymentId}.pdf`,
      },
    });

    if (existingDoc) {
      return NextResponse.json({
        success: true,
        documentId: existingDoc.id,
        storagePath: existingDoc.storagePath,
        message: "Receipt already exists",
      });
    }

    const result = await generatePaymentReceipt(paymentId);

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      storagePath: result.storagePath,
      message: "Receipt generated successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
