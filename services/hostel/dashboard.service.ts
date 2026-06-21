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
    },
  });

  const hostelsStats = await Promise.all(
    hostels.map(async (hostel) => {
      const totalBeds = await prisma.bed.count({
        where: { roomId: { in: await getRoomIdsForHostel(hostel.id) } },
      });

      const activeStays = await prisma.stay.count({
        where: {
          hostelId: hostel.id,
          status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
        },
      });

      const pendingOnboarding = await prisma.onboardingRequest.count({
        where: {
          hostelId: hostel.id,
          status: "PENDING",
        },
      });

      const occupiedBeds = activeStays;
      const availableBeds = Math.max(0, totalBeds - occupiedBeds);
      const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

      return {
        id: hostel.id,
        name: hostel.name,
        address: hostel.address,
        accommodationType: hostel.accommodationType,
        totalBeds,
        occupiedBeds,
        availableBeds,
        activeTenants: activeStays,
        pendingOnboarding,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
      };
    })
  );

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
      name: true,
      address: true,
      accommodationType: true,
    },
  });

  if (!hostel) {
    throw new Error("Hostel not found");
  }

  const totalBeds = await prisma.bed.count({
    where: { roomId: { in: await getRoomIdsForHostel(hostel.id) } },
  });

  const activeStays = await prisma.stay.count({
    where: {
      hostelId: hostel.id,
      status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
    },
  });

  const pendingOnboarding = await prisma.onboardingRequest.count({
    where: {
      hostelId: hostel.id,
      status: "PENDING",
    },
  });

  const occupiedBeds = activeStays;
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);
  const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

  return {
    totalBeds,
    occupiedBeds,
    availableBeds,
    activeTenants: activeStays,
    pendingOnboarding,
    occupancyRate: Math.round(occupancyRate * 100) / 100,
  };
}

async function getRoomIdsForHostel(hostelId: string): Promise<string[]> {
  const rooms = await prisma.room.findMany({
    where: {
      OR: [{ flat: { floor: { hostelId } } }, { floor: { hostelId } }],
    },
    select: { id: true },
  });
  return rooms.map((room) => room.id);
}