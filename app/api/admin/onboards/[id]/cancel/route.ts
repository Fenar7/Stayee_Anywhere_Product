import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { UserRole, StayStatus, BedStatus, ActivityEventType } from "@prisma/client";
import { createAdminClient } from "@/lib/auth/server";
import { logActivity } from "@/services/activity/activity.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const hostelId = await resolveHostelId(session, request);
    const { id } = await params;

    const stay = await prisma.stay.findUnique({
      where: { id },
      include: { bed: true, tenant: true },
    });

    if (!stay) {
      throw new NotFoundError("Stay record not found");
    }

    if (stay.hostelId !== hostelId) {
      throw new ForbiddenError("You are not authorized to cancel this stay");
    }

    if (stay.status !== StayStatus.ONBOARDING_PENDING) {
      throw new ValidationError(`Cannot cancel stay in state: ${stay.status}`);
    }

    const originalStatus = stay.status;

    await prisma.$transaction(async (tx) => {
      await tx.stay.update({
        where: { id },
        data: { status: StayStatus.CANCELLED },
      });

      await tx.bed.update({
        where: { id: stay.bedId },
        data: { status: BedStatus.AVAILABLE },
      });

      // Delete Supabase Auth user if one was created (tenant has userId)
      if (stay.tenant?.userId) {
        const user = await tx.user.findUnique({
          where: { id: stay.tenant.userId },
        });
        if (user?.cognitoSub) {
          try {
            const supabase = createAdminClient();
            await supabase.auth.admin.deleteUser(user.cognitoSub);
          } catch (error) {
            // Non-blocking: auth user deletion is best-effort
          }
        }
      }

      await tx.stayStatusEvent.create({
        data: {
          stayId: id,
          fromStatus: originalStatus,
          toStatus: StayStatus.CANCELLED,
          changedByUserId: session.user.id,
          note: "Onboarding request cancelled by admin",
        },
      });
    });

    void logActivity({
      organizationId: session.user.organizationId!,
      hostelId: stay.hostelId,
      eventType: ActivityEventType.TENANT_ONBOARDING_CANCELLED,
      actorId: session.user.id,
      actorName: session.user.phone ?? "Warden",
      subjectName: stay.tenant?.fullName || stay.tenantId,
      subjectId: id,
      subjectType: "Stay",
      targetUrl: `/warden/onboards/${id}`,
    });

    return NextResponse.json({
      success: true,
      message: "Onboarding request cancelled and bed freed",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
