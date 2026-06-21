import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, ConflictError, NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";
import { UserRole, OccupationType, DurationType, FoodPlan } from "@prisma/client";

const onboardSchema = z.object({
  phone: z.string().regex(/^\+91[0-9]{10}$/),
  bedId: z.string().uuid(),
  joiningDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
  durationType: z.nativeEnum(DurationType),
  foodPlan: z.nativeEnum(FoodPlan),
  isNewAdmission: z.boolean(),
  admissionFee: z.number().positive(),
  monthlyRent: z.number().positive(),
  securityDeposit: z.number().positive(),
  foodCharges: z.number().nonnegative(),
  discount: z.number().nonnegative(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN]);

    const body = await request.json();
    const data = onboardSchema.parse(body);

    const { phone, bedId, joiningDate, endDate, durationType, foodPlan, isNewAdmission, admissionFee, monthlyRent, securityDeposit, foodCharges, discount } = data;

    const warden = session.user.warden!;
    const hostelId = warden.hostelId;

    const admissionFeePaise = Math.round(admissionFee * 100);
    const monthlyRentPaise = Math.round(monthlyRent * 100);
    const securityDepositPaise = Math.round(securityDeposit * 100);
    const foodChargesPaise = Math.round(foodCharges * 100);
    const discountPaise = Math.round(discount * 100);
    const totalPayablePaise = admissionFeePaise + monthlyRentPaise + securityDepositPaise + foodChargesPaise - discountPaise;

    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      throw new ConflictError("Phone number is already registered to an active resident");
    }

    const existingPendingRequest = await prisma.onboardingRequest.findFirst({
      where: { phone, status: "PENDING" },
    });

    if (existingPendingRequest) {
      throw new ConflictError("A pending onboarding request already exists for this phone number");
    }

    const bed = await prisma.bed.findUnique({
      where: { id: bedId },
      include: {
        room: {
          include: {
            flat: {
              include: { floor: true },
            },
          },
        },
      },
    });

    if (!bed) {
      throw new NotFoundError("Bed not found");
    }

    const bedHostelId = bed.room.flat.floor.hostelId;
    await requireHostelAccess(session, bedHostelId);

    const overlappingStay = await prisma.stay.findFirst({
      where: {
        bedId,
        hostelId: bedHostelId,
        status: { in: ["ACTIVE", "EXTENDED"] },
        OR: [
          {
            joiningDate: {
              lte: new Date(endDate.getTime() + 86400000),
            },
            endDate: {
              gte: new Date(joiningDate.getTime()),
            },
          },
        ],
      },
    });

    if (overlappingStay) {
      throw new ConflictError("The selected bed is occupied during the specified dates");
    }

    const result = await prisma.$transaction(async (tx) => {
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

      const stay = await tx.stay.create({
        data: {
          tenantId: tenant.id,
          bedId,
          hostelId,
          status: "ONBOARDING_PENDING",
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
          status: "PENDING",
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