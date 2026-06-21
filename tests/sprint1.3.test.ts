import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAdminPortfolioStats, getWardenHostelStats } from "../services/hostel/dashboard.service";
import { prisma } from "../lib/db";
import { UserRole, AccommodationType, SharingType, BedStatus, StayStatus } from "@prisma/client";

// Mock the Prisma client
vi.mock("../lib/db", () => ({
  prisma: {
    hostel: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    bed: {
      count: vi.fn(),
    },
    stay: {
      count: vi.fn(),
    },
    onboardingRequest: {
      count: vi.fn(),
    },
    room: {
      findMany: vi.fn(),
    },
    floor: {
      findMany: vi.fn(),
    },
  },
}));

describe("Admin Dashboard Stats Aggregation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should correctly aggregate stats for multiple hostels", async () => {
    vi.mocked(prisma.hostel.findMany).mockResolvedValue([
      { id: "hostel-1", name: "Hostel Alpha", address: "123 Main Road, Mumbai", accommodationType: AccommodationType.MENS },
      { id: "hostel-2", name: "Hostel Beta", address: "456 Second Road, Delhi", accommodationType: AccommodationType.WOMENS },
    ]);

    vi.mocked(prisma.room.findMany).mockResolvedValue([{ id: "room-1" }, { id: "room-2" }]);

    vi.mocked(prisma.bed.count).mockResolvedValue(2);

    vi.mocked(prisma.stay.count).mockResolvedValue(1);

    vi.mocked(prisma.onboardingRequest.count).mockResolvedValue(0);

    const result = await getAdminPortfolioStats();

    expect(result.totalHostels).toBe(2);
    expect(result.totalBeds).toBe(4);
    expect(result.totalOccupiedBeds).toBe(2);
    expect(result.portfolioOccupancyRate).toBe(50);
  });

  it("should handle empty portfolio", async () => {
    vi.mocked(prisma.hostel.findMany).mockResolvedValue([]);

    vi.mocked(prisma.room.findMany).mockResolvedValue([]);
    vi.mocked(prisma.bed.count).mockResolvedValue(0);
    vi.mocked(prisma.stay.count).mockResolvedValue(0);
    vi.mocked(prisma.onboardingRequest.count).mockResolvedValue(0);

    const result = await getAdminPortfolioStats();

    expect(result.totalHostels).toBe(0);
    expect(result.totalBeds).toBe(0);
    expect(result.totalOccupiedBeds).toBe(0);
    expect(result.portfolioOccupancyRate).toBe(0);
  });

  it("should handle division by zero gracefully", async () => {
    vi.mocked(prisma.hostel.findMany).mockResolvedValue([
      { id: "hostel-empty", name: "Empty Hostel", address: "789 Empty Road, Bangalore", accommodationType: AccommodationType.MENS },
    ]);

    vi.mocked(prisma.room.findMany).mockResolvedValue([]);
    vi.mocked(prisma.bed.count).mockResolvedValue(0);
    vi.mocked(prisma.stay.count).mockResolvedValue(0);
    vi.mocked(prisma.onboardingRequest.count).mockResolvedValue(0);

    const result = await getAdminPortfolioStats();

    expect(result.totalHostels).toBe(1);
    expect(result.totalBeds).toBe(0);
    expect(result.totalOccupiedBeds).toBe(0);
    expect(result.portfolioOccupancyRate).toBe(0);
  });
});

describe("Warden Hostel Stats", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return stats for assigned hostel", async () => {
    vi.mocked(prisma.hostel.findUnique).mockResolvedValue({
      id: "hostel-1",
      name: "Hostel Alpha",
      address: "123 Main Road, Mumbai",
      accommodationType: AccommodationType.MENS,
    });

    vi.mocked(prisma.room.findMany).mockResolvedValue([{ id: "room-1" }]);
    vi.mocked(prisma.bed.count).mockResolvedValue(1);
    vi.mocked(prisma.stay.count).mockResolvedValue(0);
    vi.mocked(prisma.onboardingRequest.count).mockResolvedValue(0);

    const result = await getWardenHostelStats("hostel-1");

    expect(result.totalBeds).toBe(1);
    expect(result.occupiedBeds).toBe(0);
    expect(result.availableBeds).toBe(1);
    expect(result.activeTenants).toBe(0);
    expect(result.pendingOnboarding).toBe(0);
    expect(result.occupancyRate).toBe(0);
  });

  it("should throw error when hostel not found", async () => {
    vi.mocked(prisma.hostel.findUnique).mockResolvedValue(null);

    await expect(getWardenHostelStats("non-existent")).rejects.toThrow("Hostel not found");
  });
});