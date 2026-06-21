import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { OnboardingRequestStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // In Next.js 15+, dynamic route params are a Promise — always await
    const { id } = await params;

    const onboardingRequest = await prisma.onboardingRequest.findUnique({
      where: { id },
      include: {
        hostel: true,
        bed: true,
      },
    });

    if (!onboardingRequest) {
      throw new NotFoundError("Onboarding request not found");
    }

    if (onboardingRequest.status !== OnboardingRequestStatus.PENDING) {
      throw new ValidationError(
        "This link is no longer valid or has already been used"
      );
    }

    return NextResponse.json({
      id: onboardingRequest.id,
      phone: onboardingRequest.phone,
      hostelName: onboardingRequest.hostel.name,
      bedLabel: onboardingRequest.bed.label,
    });
  } catch (error) {
    return handleApiError(error);
  }
}