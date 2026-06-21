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
    stay: {
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    onboardingRequest: {
      groupBy: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("Admin Dashboard Stats Aggregation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should correctly aggregate stats for multiple hostels", async () => {
    vi.mocked(prisma.hostel.findMany).mockResolvedValue([
      {
        id: "hostel-1",
        name: "Hostel Alpha",
        address: "123 Main Road, Mumbai",
        accommodationType: AccommodationType.MENS,
        floors: [
          {
            rooms: [{ _count: { beds: 2 } }],
            flats: [],
          }
        ]
      },
      {
        id: "hostel-2",
        name: "Hostel Beta",
        address: "456 Second Road, Delhi",
        accommodationType: AccommodationType.WOMENS,
        floors: [
          {
            rooms: [{ _count: { beds: 2 } }],
            flats: [],
          }
        ]
      },
    ] as any);

    vi.mocked(prisma.stay.groupBy).mockResolvedValue([
      { hostelId: "hostel-1", _count: { _all: 1 } },
      { hostelId: "hostel-2", _count: { _all: 1 } },
    ] as any);

    vi.mocked(prisma.onboardingRequest.groupBy).mockResolvedValue([
      { hostelId: "hostel-1", _count: { _all: 0 } },
      { hostelId: "hostel-2", _count: { _all: 0 } },
    ] as any);

    const result = await getAdminPortfolioStats();

    expect(result.totalHostels).toBe(2);
    expect(result.totalBeds).toBe(4);
    expect(result.totalOccupiedBeds).toBe(2);
    expect(result.portfolioOccupancyRate).toBe(50);
  });

  it("should handle empty portfolio", async () => {
    vi.mocked(prisma.hostel.findMany).mockResolvedValue([]);
    vi.mocked(prisma.stay.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.onboardingRequest.groupBy).mockResolvedValue([]);

    const result = await getAdminPortfolioStats();

    expect(result.totalHostels).toBe(0);
    expect(result.totalBeds).toBe(0);
    expect(result.totalOccupiedBeds).toBe(0);
    expect(result.portfolioOccupancyRate).toBe(0);
  });

  it("should handle division by zero gracefully", async () => {
    vi.mocked(prisma.hostel.findMany).mockResolvedValue([
      {
        id: "hostel-empty",
        name: "Empty Hostel",
        address: "789 Empty Road, Bangalore",
        accommodationType: AccommodationType.MENS,
        floors: []
      },
    ] as any);
    vi.mocked(prisma.stay.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.onboardingRequest.groupBy).mockResolvedValue([]);

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
      floors: [
        {
          rooms: [{ _count: { beds: 1 } }],
          flats: [],
        }
      ]
    } as any);

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