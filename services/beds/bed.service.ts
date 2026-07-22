import { prisma } from "@/lib/db";
import { StayStatus } from "@prisma/client";

export async function checkBedConflict(
  bedId: string,
  joiningDate: Date,
  endDate?: Date | null,
  excludeStayId?: string
): Promise<boolean> {
  const overlappingStay = await prisma.stay.findFirst({
    where: {
      bedId,
      ...(excludeStayId ? { id: { not: excludeStayId } } : {}),
      status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED, StayStatus.ONBOARDING_PENDING] },
      ...(endDate ? { joiningDate: { lte: endDate } } : {}),
      OR: [
        { endDate: null },
        { endDate: { gte: joiningDate } },
      ],
    },
  });

  return !!overlappingStay;
}

export async function getAvailableBeds(hostelId: string, joiningDate: Date, endDate?: Date | null) {
  const [occupiedStays, pendingOnboardRequests] = await Promise.all([
    prisma.stay.findMany({
      where: {
        hostelId,
        status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED, StayStatus.ONBOARDING_PENDING] },
        ...(endDate ? { joiningDate: { lte: endDate } } : {}),
        OR: [
          { endDate: null },
          { endDate: { gte: joiningDate } },
        ],
      },
      select: { bedId: true },
    }),
    prisma.onboardingRequest.findMany({
      where: {
        hostelId,
        status: "PENDING",
      },
      select: { bedId: true },
    }),
  ]);

  const occupiedBedIdSet = new Set([
    ...occupiedStays.map((s) => s.bedId),
    ...pendingOnboardRequests.map((r) => r.bedId),
  ]);

  return prisma.bed.findMany({
    where: {
      status: "AVAILABLE",
      id: { notIn: Array.from(occupiedBedIdSet) },
      room: {
        OR: [
          { flat: { floor: { hostelId } } },
          { floor: { hostelId } },
        ],
      },
    },
    include: {
      room: {
        include: {
          floor: true,
          flat: { include: { floor: true } },
        },
      },
    },
    orderBy: { label: "asc" },
  });
}
