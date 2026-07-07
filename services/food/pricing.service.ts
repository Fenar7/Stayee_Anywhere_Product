import { prisma } from "@/lib/db";

export class PricingService {
  /**
   * Retrieves the active pricing record for a given organization (and optional hostel)
   * as of a specific date (defaults to now).
   */
  static async getActivePricing(organizationId: string, hostelId?: string | null, asOfDate: Date = new Date()) {
    // If hostelId is provided, look for a hostel-specific override first
    if (hostelId) {
      const hostelOverride = await prisma.foodPricing.findFirst({
        where: {
          organizationId,
          hostelId,
          effectiveFrom: { lte: asOfDate },
        },
        orderBy: { effectiveFrom: "desc" },
      });

      if (hostelOverride) return hostelOverride;
    }

    // Fall back to org-wide pricing
    const orgPricing = await prisma.foodPricing.findFirst({
      where: {
        organizationId,
        hostelId: null,
        effectiveFrom: { lte: asOfDate },
      },
      orderBy: { effectiveFrom: "desc" },
    });

    return orgPricing;
  }

  /**
   * Retrieves the entire history of pricing records for an organization.
   */
  static async getPricingHistory(organizationId: string) {
    return prisma.foodPricing.findMany({
      where: { organizationId },
      orderBy: { effectiveFrom: "desc" },
      include: {
        hostel: { select: { name: true } },
        createdByUser: { select: { firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Creates a new pricing record. It becomes effective from the specified date.
   */
  static async createPricingRecord(data: {
    organizationId: string;
    hostelId?: string | null;
    breakfastPricePaise: number;
    lunchPricePaise: number;
    dinnerPricePaise: number;
    effectiveFrom: Date;
    createdByUserId: string;
  }) {
    // Validate effective date (must not be arbitrarily in the past, to prevent retrospective corruption)
    // We allow setting today or future.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const effectiveDate = new Date(data.effectiveFrom);
    effectiveDate.setHours(0, 0, 0, 0);

    if (effectiveDate < today) {
      throw new Error("Cannot set prices retrospectively. Effective date must be today or in the future.");
    }

    if (data.breakfastPricePaise < 0 || data.lunchPricePaise < 0 || data.dinnerPricePaise < 0) {
      throw new Error("Prices cannot be negative.");
    }

    return prisma.foodPricing.create({
      data: {
        organizationId: data.organizationId,
        hostelId: data.hostelId || null,
        breakfastPricePaise: data.breakfastPricePaise,
        lunchPricePaise: data.lunchPricePaise,
        dinnerPricePaise: data.dinnerPricePaise,
        effectiveFrom: data.effectiveFrom,
        createdByUserId: data.createdByUserId,
      },
    });
  }
}
