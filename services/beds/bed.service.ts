import { prisma } from "@/lib/db";
import { StayStatus } from "@prisma/client";

export async function checkBedConflict(
  bedId: string,
  joiningDate: Date,
  endDate?: Date | null,
  excludeStayId?: string
): Promise<boolean> {
  const activeStays = await prisma.stay.findMany({
    where: {
      bedId,
      ...(excludeStayId ? { id: { not: excludeStayId } } : {}),
      status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED, StayStatus.ONBOARDING_PENDING] },
    },
    select: { joiningDate: true, endDate: true },
  });

  const targetStart = joiningDate.getTime();
  const targetEnd = endDate ? endDate.getTime() : null;

  return activeStays.some((stay) => {
    const stayStart = new Date(stay.joiningDate).getTime();
    const stayEnd = stay.endDate ? new Date(stay.endDate).getTime() : null;

    if (stayEnd !== null && stayEnd < targetStart) return false;
    if (targetEnd !== null && stayStart > targetEnd) return false;
    return true;
  });
}

export async function getAvailableBeds(hostelId: string, joiningDate: Date, endDate?: Date | null) {
  const [activeStays, pendingOnboardRequests] = await Promise.all([
    prisma.stay.findMany({
      where: {
        hostelId,
        status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED, StayStatus.ONBOARDING_PENDING] },
      },
      select: { bedId: true, joiningDate: true, endDate: true },
    }),
    prisma.onboardingRequest.findMany({
      where: {
        hostelId,
        status: "PENDING",
      },
      select: { bedId: true },
    }),
  ]);

  const targetStart = joiningDate.getTime();
  const targetEnd = endDate ? endDate.getTime() : null;

  const occupiedBedIdsFromStays = activeStays
    .filter((stay) => {
      const stayStart = new Date(stay.joiningDate).getTime();
      const stayEnd = stay.endDate ? new Date(stay.endDate).getTime() : null;

      if (stayEnd !== null && stayEnd < targetStart) return false;
      if (targetEnd !== null && stayStart > targetEnd) return false;
      return true;
    })
    .map((s) => s.bedId);

  const occupiedBedIdSet = new Set([
    ...occupiedBedIdsFromStays,
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
