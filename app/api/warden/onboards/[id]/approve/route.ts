import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { UserRole, StayStatus } from "@prisma/client";

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

    if (stay.hostelId !== hostelId) {
      throw new ForbiddenError("You are not authorized to approve this stay");
    }

    if (stay.status !== StayStatus.ONBOARDING_PENDING) {
      throw new ValidationError(`Cannot approve application in state: ${stay.status}`);
    }

    await prisma.$transaction(async (tx) => {
      // Update stay status
      await tx.stay.update({
        where: { id },
        data: {
          status: StayStatus.APPROVED_AWAITING_PAYMENT,
        },
      });

      // Record StayStatusEvent
      await tx.stayStatusEvent.create({
        data: {
          stayId: id,
          fromStatus: StayStatus.ONBOARDING_PENDING,
          toStatus: StayStatus.APPROVED_AWAITING_PAYMENT,
          changedByUserId: session.user.id,
          note: "Warden approved profile application",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Application approved successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
