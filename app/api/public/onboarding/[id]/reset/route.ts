import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ConflictError } from "@/lib/errors";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const onboardingRequest = await prisma.onboardingRequest.findUnique({
      where: { id },
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
