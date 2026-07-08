import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { UserRole, TopUpStatus, PaymentMode } from "@prisma/client";
import { z } from "zod";
import { FoodNotificationService } from "@/services/food/notifications.service";
import { logActivity } from "@/services/activity/activity.service";
import { ActivityEventType } from "@prisma/client";

const patchSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  paymentMode: z.nativeEnum(PaymentMode).optional(),
  transactionRef: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: topUpId } = await params;
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const hostelId = await resolveHostelId(session, request);
    await requireHostelAccess(session, hostelId);

    const body = await request.json();
    const data = patchSchema.parse(body);

    const topUp = await prisma.foodWalletTopUp.findUnique({
      where: { id: topUpId },
      include: { stay: { include: { tenant: true, hostel: true } } },
    });

    if (!topUp) throw new NotFoundError("Top-up request not found");
    if (topUp.stay.hostelId !== hostelId) throw new NotFoundError("Top-up request not found");
    if (topUp.status !== "PENDING") throw new ValidationError("Top-up is not pending");

    if (data.action === "APPROVE" && !data.paymentMode) {
      throw new ValidationError("Payment mode is required when approving");
    }

    const updated = await prisma.foodWalletTopUp.update({
      where: { id: topUpId },
      data: {
        status: data.action === "APPROVE" ? TopUpStatus.APPROVED : TopUpStatus.REJECTED,
        paymentMode: data.action === "APPROVE" ? data.paymentMode : null,
        transactionRef: data.action === "APPROVE" ? data.transactionRef : null,
        approvedByUserId: session.user.id,
      },
    });

    if (data.action === "APPROVE") {
      await FoodNotificationService.notifyTenantTopUpApproved(updated.id).catch(console.error);
      await logActivity({
        organizationId: topUp.stay.hostel.organizationId,
        hostelId: topUp.stay.hostelId,
        eventType: ActivityEventType.FOOD_WALLET_TOPPED_UP,
        actorId: session.user.id,
        actorName: session.user.role === UserRole.MAIN_ADMIN ? "Admin" : "Warden",
        subjectName: `Wallet Top-Up - ${topUp.stay.tenant?.fullName || "Tenant"}`,
        subjectId: updated.id,
        subjectType: "FoodWalletTopUp",
      });
    } else {
      await FoodNotificationService.notifyTenantTopUpRejected(updated.id).catch(console.error);
    }

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
