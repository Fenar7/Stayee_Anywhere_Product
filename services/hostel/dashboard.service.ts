import { prisma } from "@/lib/db";
import { BedStatus, StayStatus } from "@prisma/client";

export interface HostelStats {
  id: string;
  name: string;
  address: string;
  accommodationType: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  activeTenants: number;
  pendingOnboarding: number;
  occupancyRate: number;
}

export interface AdminPortfolioStats {
  totalHostels: number;
  totalBeds: number;
  totalOccupiedBeds: number;
  portfolioOccupancyRate: number;
  hostels: HostelStats[];
}

export interface WardenHostelStats {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  activeTenants: number;
  pendingOnboarding: number;
  occupancyRate: number;
}

export async function getAdminPortfolioStats(): Promise<AdminPortfolioStats> {
  const hostels = await prisma.hostel.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      accommodationType: true,
      floors: {
        select: {
          rooms: { select: { _count: { select: { beds: true } } } },
          flats: {
            select: {
              rooms: { select: { _count: { select: { beds: true } } } }
            }
          }
        }
      }
    }
  });

  const activeStays = await prisma.stay.groupBy({
    by: ["hostelId"],
    _count: { _all: true },
    where: {
      status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
    },
  });

  const pendingOnboardings = await prisma.onboardingRequest.groupBy({
    by: ["hostelId"],
    _count: { _all: true },
    where: {
      status: "PENDING",
    },
  });

  const activeStaysMap = new Map(activeStays.map((s) => [s.hostelId, s._count._all]));
  const pendingOnboardingsMap = new Map(pendingOnboardings.map((s) => [s.hostelId, s._count._all]));

  const hostelsStats: HostelStats[] = hostels.map((hostel) => {
    let totalBeds = 0;
    for (const floor of hostel.floors) {
      for (const room of floor.rooms) {
        totalBeds += room._count.beds;
      }
      for (const flat of floor.flats) {
        for (const room of flat.rooms) {
          totalBeds += room._count.beds;
        }
      }
    }

    const occupiedBeds = activeStaysMap.get(hostel.id) || 0;
    const availableBeds = Math.max(0, totalBeds - occupiedBeds);
    const activeTenants = occupiedBeds;
    const pendingOnboarding = pendingOnboardingsMap.get(hostel.id) || 0;
    const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

    return {
      id: hostel.id,
      name: hostel.name,
      address: hostel.address,
      accommodationType: hostel.accommodationType,
      totalBeds,
      occupiedBeds,
      availableBeds,
      activeTenants,
      pendingOnboarding,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
    };
  });

  const totalHostels = hostelsStats.length;
  const totalBeds = hostelsStats.reduce((sum, h) => sum + h.totalBeds, 0);
  const totalOccupiedBeds = hostelsStats.reduce((sum, h) => sum + h.occupiedBeds, 0);
  const portfolioOccupancyRate = totalBeds > 0 ? (totalOccupiedBeds / totalBeds) * 100 : 0;

  return {
    totalHostels,
    totalBeds,
    totalOccupiedBeds,
    portfolioOccupancyRate: Math.round(portfolioOccupancyRate * 100) / 100,
    hostels: hostelsStats,
  };
}

export async function getWardenHostelStats(hostelId: string): Promise<WardenHostelStats> {
  const hostel = await prisma.hostel.findUnique({
    where: { id: hostelId },
    select: {
      id: true,
      floors: {
        select: {
          rooms: { select: { _count: { select: { beds: true } } } },
          flats: {
            select: {
              rooms: { select: { _count: { select: { beds: true } } } }
            }
          }
        }
      }
    },
  });

  if (!hostel) {
    throw new Error("Hostel not found");
  }

  const [activeStaysCount, pendingOnboardingCount] = await Promise.all([
    prisma.stay.count({
      where: {
        hostelId,
        status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
      },
    }),
    prisma.onboardingRequest.count({
      where: {
        hostelId,
        status: "PENDING",
      },
    }),
  ]);

  let totalBeds = 0;
  for (const floor of hostel.floors) {
    for (const room of floor.rooms) {
      totalBeds += room._count.beds;
    }
    for (const flat of floor.flats) {
      for (const room of flat.rooms) {
        totalBeds += room._count.beds;
      }
    }
  }

  const occupiedBeds = activeStaysCount;
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);
  const activeTenants = activeStaysCount;
  const pendingOnboarding = pendingOnboardingCount;
  const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

  return {
    totalBeds,
    occupiedBeds,
    availableBeds,
    activeTenants,
    pendingOnboarding,
    occupancyRate: Math.round(occupancyRate * 100) / 100,
  };
}