import { PricingService } from "./pricing.service";
import { prisma } from "@/lib/db";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    foodPricing: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("PricingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getActivePricing", () => {
    it("should return hostel override if it exists", async () => {
      const mockOverride = { id: "1", hostelId: "h1", breakfastPricePaise: 5000 };
      (prisma.foodPricing.findFirst as any).mockResolvedValueOnce(mockOverride);

      const result = await PricingService.getActivePricing("org1", "h1");

      expect(prisma.foodPricing.findFirst).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockOverride);
    });

    it("should fallback to org pricing if no hostel override exists", async () => {
      const mockOrgPricing = { id: "2", hostelId: null, breakfastPricePaise: 4000 };
      
      // First call (hostel specific) returns null
      (prisma.foodPricing.findFirst as any).mockResolvedValueOnce(null);
      // Second call (org wide) returns pricing
      (prisma.foodPricing.findFirst as any).mockResolvedValueOnce(mockOrgPricing);

      const result = await PricingService.getActivePricing("org1", "h1");

      expect(prisma.foodPricing.findFirst).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockOrgPricing);
    });
  });

  describe("createPricingRecord", () => {
    it("should throw error if effective date is in the past", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

      await expect(
        PricingService.createPricingRecord({
          organizationId: "org1",
          breakfastPricePaise: 5000,
          lunchPricePaise: 5000,
          dinnerPricePaise: 5000,
          effectiveFrom: pastDate,
          createdByUserId: "user1",
        })
      ).rejects.toThrow("Cannot set prices retrospectively. Effective date must be today or in the future.");
    });

    it("should throw error if prices are out of bounds", async () => {
      await expect(
        PricingService.createPricingRecord({
          organizationId: "org1",
          breakfastPricePaise: 0, // Invalid (< 1)
          lunchPricePaise: 5000,
          dinnerPricePaise: 5000,
          effectiveFrom: new Date(),
          createdByUserId: "user1",
        })
      ).rejects.toThrow("Prices must be between ₹0.01 and ₹1000.");
    });
  });
});
