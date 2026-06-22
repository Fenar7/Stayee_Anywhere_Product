import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import { OnboardingRequestStatus } from "@prisma/client";
import { validateSchema } from "@/lib/validation/onboarding";



export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const { phone, tempPassword } = parsed.data;

    const onboardingRequest = await prisma.onboardingRequest.findUnique({
      where: { id },
    });

    if (!onboardingRequest) {
      throw new NotFoundError("Onboarding request not found");
    }

    if (onboardingRequest.status !== OnboardingRequestStatus.PENDING) {
      throw new ConflictError("This onboarding request is no longer active");
    }

    if (!onboardingRequest.tempPasswordHash) {
      throw new ConflictError("No access password has been set for this request");
    }

    // Rate limiting check
    const MAX_ATTEMPTS = 5;
    const LOCK_DURATION_MINUTES = 15;

    if (onboardingRequest.lockedUntil && onboardingRequest.lockedUntil > new Date()) {
      const remaining = Math.ceil(
        (onboardingRequest.lockedUntil.getTime() - Date.now()) / 60000
      );
      throw new ConflictError(
        `Too many failed attempts. Try again in ${remaining} minute(s).`
      );
    }

    // Validate phone
    if (onboardingRequest.phone !== phone) {
      throw new ValidationError("Phone number does not match this request");
    }

    // Validate temp password
    const inputHash = createHash("sha256").update(tempPassword).digest("hex");
    if (inputHash !== onboardingRequest.tempPasswordHash) {
      const newAttempts = onboardingRequest.failedAttempts + 1;
      const updateData: Record<string, unknown> = { failedAttempts: newAttempts };

      if (newAttempts >= MAX_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      }

      await prisma.onboardingRequest.update({
        where: { id },
        data: updateData as any,
      });

      throw new ValidationError("Invalid access password");
    }

    // Success — reset failed attempts, record access, invalidate temp password
    await prisma.onboardingRequest.update({
      where: { id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        onboardingCurrentStep: 1,
      },
    });

    return NextResponse.json({
      success: true,
      redirectUrl: `/onboard?id=${id}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
