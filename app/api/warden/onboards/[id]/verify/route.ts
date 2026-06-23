import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { verifySchema } from "@/lib/validation/onboarding";
import { verifyPayment } from "@/services/payments/payment.service";

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

    // Fetch the Stay to check authorization
    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
    });

    if (!stay) {
      throw new NotFoundError("Stay record not found");
    }

    const hostelId = await resolveHostelId(session, request, stay.hostelId);

    if (session.user.role !== UserRole.MAIN_ADMIN && stay.hostelId !== hostelId) {
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

    const result = await verifyPayment(paymentId, session.user.id);

    return NextResponse.json({
      success: true,
      activated: result.stay.status === "ACTIVE",
      message: result.stay.status === "ACTIVE" ? "Payment verified and stay activated" : "Payment verified partially",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
