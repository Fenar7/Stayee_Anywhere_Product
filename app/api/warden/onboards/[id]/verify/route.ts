import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError, ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { verifySchema } from "@/lib/validation/onboarding";
import { verifyPayment } from "@/services/payments/payment.service";
import { createNotification } from "@/lib/notifications/trigger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { id: stayId } = await params;

    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
      include: { tenant: true },
    });

    if (!stay) {
      throw new NotFoundError("Stay record not found");
    }

    const hostelId = await resolveHostelId(session, request, stay.hostelId);

    if (session.user.role !== UserRole.MAIN_ADMIN && stay.hostelId !== hostelId) {
      throw new ForbiddenError("You are not authorized to verify payment for this stay");
    }

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid body");
    }
    const { paymentId } = parsed.data;

    const result = await verifyPayment(paymentId, session.user.id, hostelId, session.user.role);

    if (stay.tenant?.userId) {
      await createNotification({
        userId: stay.tenant.userId,
        title: "Payment Verified",
        message: result.stay.status === "ACTIVE" 
          ? "Your onboarding payment has been verified and your stay is now active!"
          : "Your onboarding payment has been verified partially.",
        type: "PAYMENT",
      });
    }

    return NextResponse.json({
      success: true,
      activated: result.stay.status === "ACTIVE",
      message: result.stay.status === "ACTIVE" ? "Payment verified and stay activated" : "Payment verified partially",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
