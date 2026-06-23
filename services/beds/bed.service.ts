import { prisma } from "@/lib/db";
import { StayStatus } from "@prisma/client";

export async function checkBedConflict(
  bedId: string,
  joiningDate: Date,
  endDate: Date,
  excludeStayId?: string
): Promise<boolean> {
  const overlappingStay = await prisma.stay.findFirst({
    where: {
      bedId,
      ...(excludeStayId ? { id: { not: excludeStayId } } : {}),
      status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
      joiningDate: { lte: endDate },
      endDate: { gte: joiningDate },
    },
  });

  return !!overlappingStay;
}

export async function getAvailableBeds(hostelId: string, joiningDate: Date, endDate: Date) {
  const occupiedStays = await prisma.stay.findMany({
    where: {
      hostelId,
      status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
      joiningDate: { lte: endDate },
      endDate: { gte: joiningDate },
    },
    select: { bedId: true },
  });

  const occupiedBedIdSet = new Set(occupiedStays.map((s) => s.bedId));

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
