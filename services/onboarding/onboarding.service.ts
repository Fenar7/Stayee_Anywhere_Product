import { prisma } from "@/lib/db";
import { createHash, randomBytes } from "crypto";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { normalizePhoneNumber } from "@/lib/whatsapp/utils";
import {
  OccupationType,
  StayStatus,
  OnboardingRequestStatus,
  LeadStatus,
  BedStatus,
  DurationType,
  FoodPlan,
} from "@prisma/client";

export interface OnboardInitiateInput {
  phone: string;
  bedId: string;
  hostelId: string;
  joiningDate: Date;
  endDate: Date;
  durationType: DurationType;
  foodPlan: FoodPlan;
  isNewAdmission: boolean;
  admissionFee: number;
  monthlyRent: number;
  securityDeposit: number;
  foodCharges: number;
  discount: number;
}

export async function checkPhoneAvailability(phone: string): Promise<'new' | 'pending' | 'existing_tenant'> {
  // 1. phone already linked to a registered user account
  const existingUser = await prisma.user.findUnique({ where: { phone } });
  
  // 2. phone already has an active residential stay
  const activeStayForPhone = await prisma.stay.findFirst({
    where: {
      status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
      tenant: {
        user: { phone },
      },
    },
  });

  if (existingUser || activeStayForPhone) {
    return 'existing_tenant';
  }

  // 3. a PENDING onboarding request already exists for this phone
  const existingPendingRequest = await prisma.onboardingRequest.findFirst({
    where: { phone, status: OnboardingRequestStatus.PENDING },
  });

  if (existingPendingRequest) {
    return 'pending';
  }

  return 'new';
}

export async function initiateOnboarding(input: OnboardInitiateInput) {
  const {
    phone,
    bedId,
    hostelId,
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
  } = input;

  if (endDate <= joiningDate) {
    throw new ValidationError("End date must be after joining date");
  }

  const phoneStatus = await checkPhoneAvailability(phone);
  if (phoneStatus === 'existing_tenant') {
    throw new ConflictError("A user with this phone number is already registered or has an active stay");
  } else if (phoneStatus === 'pending') {
    throw new ConflictError("A pending onboarding request already exists for this phone number");
  }

  const hostelWarden = await prisma.warden.findUnique({
    where: { hostelId },
    select: { id: true },
  });

  if (!hostelWarden) {
    throw new NotFoundError("No warden assigned to this hostel");
  }

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

  const overlappingStay = await prisma.stay.findFirst({
    where: {
      bedId,
      status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED, StayStatus.ONBOARDING_PENDING] },
      joiningDate: { lte: endDate },
      endDate: { gte: joiningDate },
    },
  });

  if (overlappingStay) {
    throw new ConflictError("The selected bed is occupied or reserved during the specified dates");
  }

  // Double-booking check: Bed must actually be AVAILABLE
  const bed = await prisma.bed.findUnique({
    where: { id: bedId },
    include: {
      room: {
        include: {
          flat: { include: { floor: true } },
          floor: true,
        },
      },
    },
  });

  if (!bed) {
    throw new NotFoundError("Bed not found");
  }

  if (bed.status !== BedStatus.AVAILABLE) {
    throw new ConflictError(`Cannot onboard. Bed is currently ${bed.status}`);
  }

  const bedHostelId = bed.room.flat?.floor.hostelId ?? bed.room.floor?.hostelId;
  if (!bedHostelId || bedHostelId !== hostelId) {
    throw new ConflictError("Bed does not belong to the requested hostel");
  }

  const tempPassword = randomBytes(6).toString("base64url").slice(0, 10);
  const tempPasswordHash = createHash("sha256").update(tempPassword).digest("hex");

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        userId: null,
        fullName: `Prospect ${phone}`,
      },
    });

    const stay = await tx.stay.create({
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
        wardenId: hostelWarden.id,
        status: OnboardingRequestStatus.PENDING,
        tempPasswordHash,
      },
    });

    await tx.bed.update({
      where: { id: bedId },
      data: { status: BedStatus.ON_HOLD },
    });

    return { onboardingRequest, stay };
  });

  const normalizedOnboardPhone = normalizePhoneNumber(phone);
  await prisma.lead.updateMany({
    where: {
      phone: normalizedOnboardPhone,
      status: { not: LeadStatus.CONVERTED },
    },
    data: {
      status: LeadStatus.CONVERTED,
    },
  });

  return {
    requestId: result.onboardingRequest.id,
    tempPassword,
    entryGateLink: `/onboarding?id=${result.onboardingRequest.id}`,
  };
}
