import { Prisma, FoodBillingMode, FoodPlan } from "@prisma/client";
import { getStartOfDayIST, getEndOfMonthIST } from "@/lib/dates";
import { PricingService } from "./pricing.service";
import { ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/db";

export class FoodCycleService {
  /**
   * Creates the initial FoodBillingCycle for a stay during onboarding.
   * Throws an error if no active pricing is found.
   */
  static async createCycleForStay(
    tx: Prisma.TransactionClient,
    stayId: string,
    organizationId: string,
    hostelId: string,
    foodBillingMode: FoodBillingMode,
    foodPlan: FoodPlan,
    joiningDate: Date,
  ) {
    if (foodBillingMode === FoodBillingMode.FLAT_RATE || foodPlan === FoodPlan.NOT_INCLUDED) {
      return null;
    }

    // Get active pricing as of the joining date
    const pricing = await PricingService.getActivePricing(organizationId, hostelId, joiningDate);
    
    if (!pricing) {
      throw new ValidationError("Cannot enable consumption-based food billing: No active meal prices configured for this date.");
    }

    const cycleStart = getStartOfDayIST(joiningDate);
    const cycleEnd = getEndOfMonthIST(cycleStart);

    const cycle = await tx.foodBillingCycle.create({
      data: {
        stayId,
        cycleStart,
        cycleEnd,
        status: "OPEN",
        breakfastPricePaise: pricing.breakfastPricePaise,
        lunchPricePaise: pricing.lunchPricePaise,
        dinnerPricePaise: pricing.dinnerPricePaise,
      },
    });

    return cycle;
  }

  /**
   * Idempotently fetches the current active cycle for a stay.
   */
  static async getOrCreateCurrentCycle(stayId: string) {
    const activeCycle = await prisma.foodBillingCycle.findFirst({
      where: {
        stayId,
        status: "OPEN",
      },
      orderBy: { cycleStart: "desc" },
    });

    if (activeCycle) {
      return activeCycle;
    }

    // Cycle doesn't exist. We must create it.
    // To do this, we need the stay, its food plan, billing mode, and joining date.
    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
      include: {
        hostel: { select: { organizationId: true } },
      },
    });

    if (!stay || stay.foodPlan === FoodPlan.NOT_INCLUDED || stay.foodBillingMode === FoodBillingMode.FLAT_RATE) {
      return null;
    }

    // Spin up a quick transaction to use our shared creation logic
    return await prisma.$transaction(async (tx) => {
      return await FoodCycleService.createCycleForStay(
        tx,
        stay.id,
        stay.hostel.organizationId,
        stay.hostelId,
        stay.foodBillingMode,
        stay.foodPlan,
        stay.joiningDate
      );
    });
  }

  /**
   * Closes an active cycle upon early or natural checkout.
   */
  static async closeCycle(
    tx: Prisma.TransactionClient,
    stayId: string,
    checkoutDate: Date,
    userId: string | null
  ) {
    await tx.foodBillingCycle.updateMany({
      where: {
        stayId,
        status: "OPEN",
      },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedByUserId: userId,
        cycleEnd: checkoutDate,
      },
    });
  }
}
