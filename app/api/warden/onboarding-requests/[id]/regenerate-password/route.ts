import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { UserRole, OnboardingRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const reqId = (await params).id;

    let customPassword: string | undefined = undefined;
    try {
      const body = await request.json();
      if (body && typeof body.customPassword === "string") {
        customPassword = body.customPassword.trim();
      }
    } catch {
      // Body may be empty on standard resend link calls
    }

    const onboardingReq = await prisma.onboardingRequest.findUnique({
      where: { id: reqId },
    });

    if (!onboardingReq) {
      throw new NotFoundError("Onboarding request not found");
    }

    // Verify warden has access to this hostel
    if (session.user.role === UserRole.WARDEN) {
      const hostelId = await resolveHostelId(session);
      if (onboardingReq.hostelId !== hostelId) {
        throw new NotFoundError("Onboarding request not found");
      }
    }

    if (onboardingReq.status !== OnboardingRequestStatus.PENDING) {
      throw new ValidationError(
        "Cannot regenerate password for a completed or cancelled request"
      );
    }

    let tempPassword = "";
    if (customPassword) {
      if (customPassword.length < 4) {
        throw new ValidationError("Custom password must be at least 4 characters");
      }
      tempPassword = customPassword;
    } else {
      tempPassword = randomBytes(6).toString("base64url").slice(0, 8);
    }

    const tempPasswordHash = createHash("sha256").update(tempPassword).digest("hex");

    await prisma.onboardingRequest.update({
      where: { id: reqId },
      data: {
        tempPasswordHash,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    const entryGateLink = `/onboarding?id=${reqId}`;

    return NextResponse.json({
      tempPassword,
      entryGateLink,
      requestId: reqId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
