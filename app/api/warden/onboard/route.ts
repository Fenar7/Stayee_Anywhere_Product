import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import {
  handleApiError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { UserRole } from "@prisma/client";

import { onboardSchema } from "@/lib/validation/onboarding";
import { initiateOnboarding } from "@/services/onboarding/onboarding.service";
import { logActivity } from "@/services/activity/activity.service";
import { ActivityEventType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);

    const body = await request.json();

    const parseResult = onboardSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.issues[0]?.message ?? "Validation failed"
      );
    }
    const data = parseResult.data;

    const hostelId = await resolveHostelId(session, request, data.hostelId);

    // Guard: warden may only onboard into their own hostel
    await requireHostelAccess(session, hostelId);

    const result = await initiateOnboarding({
      phone: data.phone,
      bedId: data.bedId,
      hostelId,
      joiningDate: data.joiningDate,
      endDate: data.endDate,
      durationType: data.durationType,
      foodPlan: data.foodPlan,
      foodBillingMode: data.foodBillingMode,
      isNewAdmission: data.isNewAdmission,
      admissionFee: data.admissionFee,
      monthlyRent: data.monthlyRent,
      securityDeposit: data.securityDeposit,
      foodCharges: data.foodCharges,
      discount: data.discount,
    });

    void logActivity({
      organizationId: session.user.organizationId!,
      hostelId: hostelId,
      eventType: ActivityEventType.TENANT_ONBOARDING_STARTED,
      actorId: session.user.id,
      actorName: session.user.phone ?? "Admin",
      subjectName: data.phone,
      subjectId: result.requestId,
      subjectType: "OnboardingRequest",
      targetUrl: `/warden/onboards/${result.requestId}`,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
