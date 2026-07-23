import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import { OnboardingRequestStatus, ActivityEventType } from "@prisma/client";
import { validateSchema } from "@/lib/validation/onboarding";
import { normalizePhoneNumber } from "@/lib/whatsapp/utils";
import { logActivity } from "@/services/activity/activity.service";

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
      include: { hostel: { select: { organizationId: true } } },
    });

    if (!onboardingRequest) {
      throw new NotFoundError("Onboarding request not found");
    }

    if (onboardingRequest.status !== OnboardingRequestStatus.PENDING) {
      throw new ConflictError("This onboarding link is no longer active");
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

    // Validate phone (normalized comparison to handle formatting/country code differences)
    let isPhoneMatch = onboardingRequest.phone === phone;
    try {
      isPhoneMatch = normalizePhoneNumber(onboardingRequest.phone) === normalizePhoneNumber(phone);
    } catch {
      // Fallback to direct string match if normalization fails
    }

    if (!isPhoneMatch) {
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
        data: updateData as import("@prisma/client").Prisma.OnboardingRequestUpdateInput,
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

    void logActivity({
      organizationId: onboardingRequest.hostel.organizationId,
      hostelId: onboardingRequest.hostelId,
      eventType: ActivityEventType.TENANT_ONBOARDING_PROGRESS,
      actorName: onboardingRequest.phone,
      subjectName: onboardingRequest.phone,
      subjectId: id,
      subjectType: "OnboardingRequest",
      targetUrl: `/warden/onboards/${id}`,
    });

    return NextResponse.json({
      success: true,
      redirectUrl: `/onboard?id=${id}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
