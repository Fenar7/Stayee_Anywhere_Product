import { prisma } from "@/lib/db";
import { BedStatus, StayStatus, PaymentStatus } from "@prisma/client";

export interface HostelStats {
  id: string;
  name: string;
  address: string;
  accommodationType: string;
  location?: { id: string; name: string } | null;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  activeTenants: number;
  pendingOnboarding: number;
  pendingPayments: number;
  occupancyRate: number;
  warden?: { id: string; phone: string; email: string | null } | null;
}

export interface AdminPortfolioStats {
  totalHostels: number;
  totalBeds: number;
  totalOccupiedBeds: number;
  portfolioOccupancyRate: number;
  totalPendingPayments: number;
  hostels: HostelStats[];
}

export interface WardenHostelStats {
  hostelName: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  activeTenants: number;
  pendingOnboarding: number;
  pendingPayments: number;
  occupancyRate: number;
}

export async function getAdminPortfolioStats(): Promise<AdminPortfolioStats> {
  const hostels = await prisma.hostel.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      accommodationType: true,
      location: {
        select: {
          id: true,
          name: true,
        },
      },
      warden: {
        select: {
          id: true,
          user: {
            select: {
              phone: true,
              email: true,
            },
          },
        },
      },
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

  const [activeStays, pendingOnboardings, pendingPayments] = await Promise.all([
    prisma.stay.groupBy({
      by: ["hostelId"],
      _count: { _all: true },
      where: {
        status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
      },
    }),
    prisma.onboardingRequest.groupBy({
      by: ["hostelId"],
      _count: { _all: true },
      where: {
        status: "PENDING",
      },
    }),
    prisma.payment.groupBy({
      by: ["stayId"],
      _count: { _all: true },
      where: {
        paymentStatus: PaymentStatus.PENDING,
      },
    }),
  ]);

  const activeStaysMap = new Map(activeStays.map((s) => [s.hostelId, s._count._all]));
  const pendingOnboardingsMap = new Map(pendingOnboardings.map((s) => [s.hostelId, s._count._all]));

  const stayIds = pendingPayments.map((p) => p.stayId);
  const stays = stayIds.length > 0
    ? await prisma.stay.findMany({ where: { id: { in: stayIds } }, select: { id: true, hostelId: true } })
    : [];
  const stayToHostelMap = new Map(stays.map((s) => [s.id, s.hostelId]));
  const pendingPaymentsMap = new Map<string, number>();
  for (const pp of pendingPayments) {
    const hid = stayToHostelMap.get(pp.stayId);
    if (hid) {
      pendingPaymentsMap.set(hid, (pendingPaymentsMap.get(hid) || 0) + pp._count._all);
    }
  }

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
    const pendingPayments = pendingPaymentsMap.get(hostel.id) || 0;
    const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

    return {
      id: hostel.id,
      name: hostel.name,
      address: hostel.address,
      accommodationType: hostel.accommodationType,
      location: hostel.location,
      totalBeds,
      occupiedBeds,
      availableBeds,
      activeTenants,
      pendingOnboarding,
      pendingPayments,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      warden: hostel.warden
        ? {
            id: hostel.warden.id,
            phone: hostel.warden.user.phone,
            email: hostel.warden.user.email,
          }
        : null,
    };
  });

  const totalHostels = hostelsStats.length;
  const totalBeds = hostelsStats.reduce((sum, h) => sum + h.totalBeds, 0);
  const totalOccupiedBeds = hostelsStats.reduce((sum, h) => sum + h.occupiedBeds, 0);
  const portfolioOccupancyRate = totalBeds > 0 ? (totalOccupiedBeds / totalBeds) * 100 : 0;
  const totalPendingPayments = hostelsStats.reduce((sum, h) => sum + h.pendingPayments, 0);

  return {
    totalHostels,
    totalBeds,
    totalOccupiedBeds,
    portfolioOccupancyRate: Math.round(portfolioOccupancyRate * 100) / 100,
    totalPendingPayments,
    hostels: hostelsStats,
  };
}

export async function getWardenHostelStats(hostelId: string): Promise<WardenHostelStats> {
  const hostel = await prisma.hostel.findUnique({
    where: { id: hostelId },
    select: {
      id: true,
      name: true,
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

  const [activeStaysCount, pendingOnboardingCount, pendingPaymentsCount] = await Promise.all([
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
    prisma.payment.count({
      where: {
        stay: { hostelId },
        paymentStatus: PaymentStatus.PENDING,
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
    hostelName: hostel.name,
    totalBeds,
    occupiedBeds,
    availableBeds,
    activeTenants,
    pendingOnboarding,
    pendingPayments: pendingPaymentsCount,
    occupancyRate: Math.round(occupancyRate * 100) / 100,
  };
}