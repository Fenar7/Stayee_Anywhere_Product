import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const reqId = (await params).id;

    const onboardingReq = await prisma.onboardingRequest.findUnique({
      where: { id: reqId },
      include: {
        hostel: { select: { name: true } },
        bed: { select: { label: true, room: { select: { roomNumber: true } } } },
      },
    });

    if (!onboardingReq) {
      throw new NotFoundError("Onboarding request not found");
    }

    if (session.user.role === UserRole.WARDEN) {
      const hostelId = await resolveHostelId(session);
      if (onboardingReq.hostelId !== hostelId) {
        throw new NotFoundError("Onboarding request not found");
      }
    }

    const entryGateLink = `/onboarding?id=${reqId}`;
    const isTenantSet = onboardingReq.onboardingCurrentStep >= 1;

    return NextResponse.json({
      requestId: reqId,
      phone: onboardingReq.phone,
      entryGateLink,
      onboardingCurrentStep: onboardingReq.onboardingCurrentStep,
      isTenantSet,
      tempPassword: isTenantSet ? "Set by Tenant (Encrypted)" : "Enter Access Key",
      hostelName: onboardingReq.hostel.name,
      bedLabel: `${onboardingReq.bed.room?.roomNumber || "Room"} - ${onboardingReq.bed.label}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
