import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  handleApiError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import {
  UserRole,
  OccupationType,
  DurationType,
  FoodPlan,
  StayStatus,
  OnboardingRequestStatus,
} from "@prisma/client";

const onboardSchema = z.object({
  phone: z
    .string()
    .regex(/^\+91[0-9]{10}$/, "Phone must be in format +91XXXXXXXXXX"),
  bedId: z.string().uuid("Invalid bed ID format"),
  joiningDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
  durationType: z.nativeEnum(DurationType),
  foodPlan: z.nativeEnum(FoodPlan),
  isNewAdmission: z.boolean(),
  admissionFee: z.number().nonnegative(),
  monthlyRent: z.number().positive(),
  securityDeposit: z.number().nonnegative(),
  foodCharges: z.number().nonnegative(),
  discount: z.number().nonnegative(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN]);

    const body = await request.json();

    // Use safeParse so we can return a clean ValidationError instead of an unhandled ZodError
    const parseResult = onboardSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.issues[0]?.message ?? "Validation failed"
      );
    }
    const data = parseResult.data;

    const {
      phone,
      bedId,
      joiningDate,
      endDate,
      durationType,
      foodPlan,
      isNewAdmission,
      admissionFee,
      monthlyRent,
      securityDeposit,
      foodCharges,
      discount,
    } = data;

    // Guard: end date must be strictly after joining date
    if (endDate <= joiningDate) {
      throw new ValidationError("End date must be after joining date");
    }

    const warden = session.user.warden!;
    const hostelId = warden.hostelId;

    // Convert Rupees to Paise (integer storage — never floats)
    const admissionFeePaise = Math.round(admissionFee * 100);
    const monthlyRentPaise = Math.round(monthlyRent * 100);
    const securityDepositPaise = Math.round(securityDeposit * 100);
    const foodChargesPaise = Math.round(foodCharges * 100);
    const discountPaise = Math.round(discount * 100);
    const totalPayablePaise =
      admissionFeePaise +
      monthlyRentPaise +
      securityDepositPaise +
      foodChargesPaise -
      discountPaise;

    // Guard 1: phone already belongs to a registered user
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      throw new ConflictError(
        "Phone number is already registered to an active resident"
      );
    }

    // Guard 2: a PENDING onboarding request already exists for this phone
    const existingPendingRequest = await prisma.onboardingRequest.findFirst({
      where: { phone, status: OnboardingRequestStatus.PENDING },
    });
    if (existingPendingRequest) {
      throw new ConflictError(
        "A pending onboarding request already exists for this phone number"
      );
    }

    // Guard 3: fetch bed — rooms can be linked either via flat->floor OR directly to floor
    const bed = await prisma.bed.findUnique({
      where: { id: bedId },
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

    // Safe hostelId resolution — never assume flat is non-null
    const bedHostelId =
      bed.room.flat?.floor.hostelId ?? bed.room.floor?.hostelId;

    if (!bedHostelId) {
      throw new NotFoundError(
        "Hostel mapping for the selected bed could not be resolved"
      );
    }

    // Guard 4: warden may only onboard into their own hostel
    await requireHostelAccess(session, bedHostelId);

    // Guard 5: date-range overlap check for ACTIVE / EXTENDED stays on this bed
    const overlappingStay = await prisma.stay.findFirst({
      where: {
        bedId,
        status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
        joiningDate: { lte: endDate },
        endDate: { gte: joiningDate },
      },
    });

    if (overlappingStay) {
      throw new ConflictError(
        "The selected bed is occupied during the specified dates"
      );
    }

    // Atomic transaction: draft Tenant → Stay → OnboardingRequest
    const result = await prisma.$transaction(async (tx) => {
      // Create a placeholder tenant (profile will be filled by the prospect in Sprint 2.2)
      const tenant = await tx.tenant.create({
        data: {
          userId: null,
          fullName: `Prospect ${phone}`,
          dateOfBirth: new Date("2000-01-01"),
          gender: "MALE",
          placeOfBirth: "Unknown",
          permanentAddress: "Unknown",
          emergencyContactName: "Unknown",
          relationship: "Unknown",
          emergencyContactNumber: phone,
          parentGuardianName: "Unknown",
          parentGuardianContact: phone,
          occupationType: OccupationType.STUDENT,
          purposeOfStay: "Hostel Accommodation",
        },
      });

      await tx.stay.create({
        data: {
          tenantId: tenant.id,
          bedId,
          hostelId,
          status: StayStatus.ONBOARDING_PENDING,
          durationType,
          joiningDate,
          endDate,
          isNewAdmission,
          admissionFeePaise,
          monthlyRentPaise,
          securityDepositPaise,
          foodChargesPaise,
          foodPlan,
          totalPayablePaise,
          discountPaise,
        },
      });

      const onboardingRequest = await tx.onboardingRequest.create({
        data: {
          phone,
          hostelId,
          bedId,
          wardenId: warden.id,
          status: OnboardingRequestStatus.PENDING,
        },
      });

      return onboardingRequest;
    });

    return NextResponse.json({
      requestId: result.id,
      entryGateLink: `/newuser?id=${result.id}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}