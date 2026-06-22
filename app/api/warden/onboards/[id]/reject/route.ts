import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { UserRole, StayStatus, BedStatus } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { id } = await params;

    const stay = await prisma.stay.findUnique({
      where: { id },
    });

    if (!stay) {
      throw new NotFoundError("Stay record not found");
    }

    const hostelId = await resolveHostelId(session, request, stay.hostelId);

    if (session.user.role !== UserRole.MAIN_ADMIN && stay.hostelId !== hostelId) {
      throw new ForbiddenError("You are not authorized to reject this stay");
    }

    if (
      stay.status !== StayStatus.ONBOARDING_PENDING &&
      stay.status !== StayStatus.APPROVED_AWAITING_PAYMENT
    ) {
      throw new ValidationError(`Cannot reject application in state: ${stay.status}`);
    }

    const originalStatus = stay.status;

    await prisma.$transaction(async (tx) => {
      // Update stay status to CANCELLED
      await tx.stay.update({
        where: { id },
        data: {
          status: StayStatus.CANCELLED,
        },
      });

      // Free the bed back to AVAILABLE
      await tx.bed.update({
        where: { id: stay.bedId },
        data: { status: BedStatus.AVAILABLE },
      });

      // Record StayStatusEvent
      await tx.stayStatusEvent.create({
        data: {
          stayId: id,
          fromStatus: originalStatus,
          toStatus: StayStatus.CANCELLED,
          changedByUserId: session.user.id,
          note: "Warden rejected application",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Application rejected successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
