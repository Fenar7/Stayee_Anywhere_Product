import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ConflictError } from "@/lib/errors";
import { ActivityEventType } from "@prisma/client";
import { logActivity } from "@/services/activity/activity.service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const onboardingRequest = await prisma.onboardingRequest.findUnique({
      where: { id },
      include: { hostel: { select: { organizationId: true } } },
    });

    if (!onboardingRequest) {
      throw new NotFoundError("Onboarding request not found");
    }

    if (onboardingRequest.status !== "PENDING") {
      throw new ConflictError("This onboarding request is no longer active");
    }

    // Reset onboarding step to Step 1
    await prisma.onboardingRequest.update({
      where: { id },
      data: { onboardingCurrentStep: 1 },
    });

    void logActivity({
      organizationId: onboardingRequest.hostel.organizationId,
      hostelId: onboardingRequest.hostelId,
      eventType: ActivityEventType.TENANT_ONBOARDING_RESET,
      actorName: onboardingRequest.phone,
      subjectName: onboardingRequest.phone,
      subjectId: id,
      subjectType: "OnboardingRequest",
      targetUrl: `/warden/onboards/${id}`,
    });

    // Find and reset draft tenant fields
    const draftStay = await prisma.stay.findFirst({
      where: {
        bedId: onboardingRequest.bedId,
        status: "ONBOARDING_PENDING",
        tenant: { userId: null },
      },
      select: { tenantId: true },
    });

    if (draftStay?.tenantId) {
      await prisma.tenant.update({
        where: { id: draftStay.tenantId },
        data: {
          fullName: `Prospect +${onboardingRequest.phone.replace(/\D/g, "")}`,
          dateOfBirth: null,
          gender: "MALE",
          placeOfBirth: null,
          permanentAddress: null,
          emergencyContactName: null,
          relationship: null,
          emergencyContactNumber: null,
          parentGuardianName: null,
          parentGuardianContact: null,
          occupationType: "STUDENT",
          collegeName: null,
          courseOrBranch: null,
          companyName: null,
          designation: null,
          purposeOfStay: "Hostel Accommodation",
        },
      });
    }

    return NextResponse.json({ success: true, step: 1 });
  } catch (error) {
    return handleApiError(error);
  }
}
