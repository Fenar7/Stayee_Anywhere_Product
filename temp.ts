import { prisma } from '@/lib/db';
import { BedStatus, StayStatus, PaymentStatus } from '@prisma/client';

export interface HostelStats {
  id: string;
  name: string;
  address: string;
  accommodationType: string;
  location?: { id: string; name: string } | null;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  bedsOnHold: number;
  bedsBlocked: number;
  bedsReserved: number;
  activeTenants: number;
  pendingOnboarding: number;
  submittedForApproval: number;
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
  totalBedsAvailable: number;
  totalBedsOnHold: number;
  totalBedsReserved: number;
  totalBedsBlocked: number;
  totalOnboardingStarted: number;
  totalSubmittedForApproval: number;
  hostels: HostelStats[];
}

export interface WardenHostelStats {
  hostelName: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  bedsOnHold: number;
  bedsBlocked: number;
  bedsReserved: number;
  activeTenants: number;
  pendingOnboarding: number;
  submittedForApproval: number;
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
          rooms: { select: { beds: { select: { status: true } } } },
          flats: {
            select: {
              rooms: { select: { beds: { select: { status: true } } } }
            }
          }
        }
      }
    }
  });

  const [stayStats, pendingOnboardings, pendingPayments] = await Promise.all([
    prisma.stay.groupBy({
      by: ['hostelId', 'status'],
      _count: { _all: true },
    }),
    prisma.onboardingRequest.groupBy({
      by: ['hostelId'],
      _count: { _all: true },
      where: {
        status: 'PENDING',
      },
    }),
    prisma.payment.groupBy({
      by: ['stayId'],
      _count: { _all: true },
      where: {
        paymentStatus: PaymentStatus.PENDING,
      },
    }),
  ]);

  const stayStatsMap = new Map<string, Record<string, number>>();
  for (const s of stayStats) {
    if (!stayStatsMap.has(s.hostelId)) {
      stayStatsMap.set(s.hostelId, {});
    }
    stayStatsMap.get(s.hostelId)![s.status] = s._count._all;
  }

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
    let availableBeds = 0;
    let occupiedBeds = 0;
    let bedsOnHold = 0;
    let bedsBlocked = 0;

    for (const floor of hostel.floors) {
      for (const room of floor.rooms) {
        for (const bed of room.beds) {
          totalBeds++;
          if (bed.status === BedStatus.AVAILABLE) availableBeds++;
          else if (bed.status === BedStatus.OCCUPIED) occupiedBeds++;
          else if (bed.status === BedStatus.ON_HOLD) bedsOnHold++;
          else if (bed.status === BedStatus.NOT_IN_USE || bed.status === BedStatus.IN_MAINTENANCE) bedsBlocked++;
        }
      }
      for (const flat of floor.flats) {
        for (const room of flat.rooms) {
          for (const bed of room.beds) {
            totalBeds++;
            if (bed.status === BedStatus.AVAILABLE) availableBeds++;
            else if (bed.status === BedStatus.OCCUPIED) occupiedBeds++;
            else if (bed.status === BedStatus.ON_HOLD) bedsOnHold++;
            else if (bed.status === BedStatus.NOT_IN_USE || bed.status === BedStatus.IN_MAINTENANCE) bedsBlocked++;
          }
        }
      }
    }

    const hStats = stayStatsMap.get(hostel.id) || {};
    const activeTenants = (hStats[StayStatus.ACTIVE] || 0) + (hStats[StayStatus.EXTENDED] || 0);
    const submittedForApproval = hStats[StayStatus.ONBOARDING_PENDING] || 0;
    const stayPaymentPending = hStats[StayStatus.APPROVED_AWAITING_PAYMENT] || 0;

    const pendingOnboarding = pendingOnboardingsMap.get(hostel.id) || 0;
    const pendingPayments = (pendingPaymentsMap.get(hostel.id) || 0) + stayPaymentPending;
    
    const bedsReserved = pendingOnboarding + submittedForApproval + pendingPayments;
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
      bedsOnHold,
      bedsBlocked,
      bedsReserved,
      activeTenants,
      pendingOnboarding,
      submittedForApproval,
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
  
  const totalBedsAvailable = hostelsStats.reduce((sum, h) => sum + h.availableBeds, 0);
  const totalBedsOnHold = hostelsStats.reduce((sum, h) => sum + h.bedsOnHold, 0);
  const totalBedsReserved = hostelsStats.reduce((sum, h) => sum + h.bedsReserved, 0);
  const totalBedsBlocked = hostelsStats.reduce((sum, h) => sum + h.bedsBlocked, 0);
  const totalOnboardingStarted = hostelsStats.reduce((sum, h) => sum + h.pendingOnboarding, 0);
  const totalSubmittedForApproval = hostelsStats.reduce((sum, h) => sum + h.submittedForApproval, 0);

  return {
    totalHostels,
    totalBeds,
    totalOccupiedBeds,
    portfolioOccupancyRate: Math.round(portfolioOccupancyRate * 100) / 100,
    totalPendingPayments,
    totalBedsAvailable,
    totalBedsOnHold,
    totalBedsReserved,
    totalBedsBlocked,
    totalOnboardingStarted,
    totalSubmittedForApproval,
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
          rooms: { select: { beds: { select: { status: true } } } },
          flats: {
            select: {
              rooms: { select: { beds: { select: { status: true } } } }
            }
          }
        }
      }
    },
  });

  if (!hostel) {
    throw new Error('Hostel not found');
  }

  const [stayStats, pendingOnboardingCount, pendingPaymentsCount] = await Promise.all([
    prisma.stay.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: {
        hostelId
      }
    }),
    prisma.onboardingRequest.count({
      where: {
        hostelId,
        status: 'PENDING',
      },
    }),
    prisma.payment.count({
      where: {
        stay: { hostelId },
        paymentStatus: PaymentStatus.PENDING,
      },
    }),
  ]);

  const hStats: Record<string, number> = {};
  for (const s of stayStats) {
    hStats[s.status] = s._count._all;
  }

  let totalBeds = 0;
  let availableBeds = 0;
  let occupiedBeds = 0;
  let bedsOnHold = 0;
  let bedsBlocked = 0;

  for (const floor of hostel.floors) {
    for (const room of floor.rooms) {
      for (const bed of room.beds) {
        totalBeds++;
        if (bed.status === BedStatus.AVAILABLE) availableBeds++;
        else if (bed.status === BedStatus.OCCUPIED) occupiedBeds++;
        else if (bed.status === BedStatus.ON_HOLD) bedsOnHold++;
        else if (bed.status === BedStatus.NOT_IN_USE || bed.status === BedStatus.IN_MAINTENANCE) bedsBlocked++;
      }
    }
    for (const flat of floor.flats) {
      for (const room of flat.rooms) {
        for (const bed of room.beds) {
          totalBeds++;
          if (bed.status === BedStatus.AVAILABLE) availableBeds++;
          else if (bed.status === BedStatus.OCCUPIED) occupiedBeds++;
          else if (bed.status === BedStatus.ON_HOLD) bedsOnHold++;
          else if (bed.status === BedStatus.NOT_IN_USE || bed.status === BedStatus.IN_MAINTENANCE) bedsBlocked++;
        }
      }
    }
  }

  const activeTenants = (hStats[StayStatus.ACTIVE] || 0) + (hStats[StayStatus.EXTENDED] || 0);
  const submittedForApproval = hStats[StayStatus.ONBOARDING_PENDING] || 0;
  const stayPaymentPending = hStats[StayStatus.APPROVED_AWAITING_PAYMENT] || 0;

  const pendingOnboarding = pendingOnboardingCount;
  const pendingPayments = pendingPaymentsCount + stayPaymentPending;
  const bedsReserved = pendingOnboarding + submittedForApproval + pendingPayments;
  
  const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

  return {
    hostelName: hostel.name,
    totalBeds,
    occupiedBeds,
    availableBeds,
    bedsOnHold,
    bedsBlocked,
    bedsReserved,
    activeTenants,
    pendingOnboarding,
    submittedForApproval,
    pendingPayments,
    occupancyRate: Math.round(occupancyRate * 100) / 100,
  };
}

