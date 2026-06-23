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

    // Guard: fetch bed — rooms can be linked either via flat->floor OR directly to floor
    const bed = await prisma.bed.findUnique({
      where: { id: data.bedId },
      include: {
        room: {
          include: {
            flat: { include: { floor: true } },
            floor: true, // direct floor link (when flatId is null)
          },
        },
      },
    });

    if (!bed) {
      throw new NotFoundError("Bed not found");
    }

    const bedHostelId = bed.room.flat?.floor.hostelId ?? bed.room.floor?.hostelId;

    if (!bedHostelId) {
      throw new NotFoundError(
        "Hostel mapping for the selected bed could not be resolved"
      );
    }

    // Guard: warden may only onboard into their own hostel
    await requireHostelAccess(session, bedHostelId);

    const result = await initiateOnboarding({
      phone: data.phone,
      bedId: data.bedId,
      hostelId,
      joiningDate: data.joiningDate,
      endDate: data.endDate,
      durationType: data.durationType,
      foodPlan: data.foodPlan,
      isNewAdmission: data.isNewAdmission,
      admissionFee: data.admissionFee,
      monthlyRent: data.monthlyRent,
      securityDeposit: data.securityDeposit,
      foodCharges: data.foodCharges,
      discount: data.discount,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
