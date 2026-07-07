import { prisma } from "@/lib/db";
import { SettlementOutcome, FoodBillingMode, FoodPlan, StayStatus, Prisma } from "@prisma/client";
import { FoodCycleService } from "./cycle.service";

export class FoodSettlementService {
  /**
   * Settles an individual stay's food billing cycle.
   * Fully idempotent: returns the cycle immediately if already closed.
   */
  static async settleStayCycle(stayId: string, cycleId: string, closingUserId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch cycle and ensure it's OPEN
      const cycle = await tx.foodBillingCycle.findUnique({
        where: { id: cycleId },
        include: {
          stay: {
            include: { hostel: { select: { organizationId: true } } }
          }
        },
      });

      if (!cycle) {
        throw new Error(`Cycle ${cycleId} not found.`);
      }

      if (cycle.status !== "OPEN") {
        if (cycle.status === "CLOSED") {
          return cycle; // Idempotent success
        }
        throw new Error(`Cycle ${cycleId} is in status ${cycle.status}. Only OPEN cycles can be settled.`);
      }

      const stay = cycle.stay;

      // For FLAT_RATE or NOT_INCLUDED, there is no financial settlement to compute.
      if (stay.foodBillingMode === FoodBillingMode.FLAT_RATE || stay.foodPlan === FoodPlan.NOT_INCLUDED) {
        const closedCycle = await tx.foodBillingCycle.update({
          where: { id: cycleId },
          data: {
            status: "CLOSED",
            closedAt: new Date(),
            closedByUserId: closingUserId,
          },
        });
        await this.generateNextCycleIfNeeded(tx, stay, cycle.cycleEnd, 0);
        return closedCycle;
      }

      // 2. Compute Consumed Cost based on frozen cycle prices
      const orders = await tx.foodOrder.findMany({
        where: {
          stayId,
          forDate: { gte: cycle.cycleStart, lte: cycle.cycleEnd },
        },
      });

      let consumedPaise = 0;
      for (const order of orders) {
        if (order.breakfast) consumedPaise += cycle.breakfastPricePaise;
        if (order.lunch) consumedPaise += cycle.lunchPricePaise;
        if (order.dinner) consumedPaise += cycle.dinnerPricePaise;
      }

      // 3. Compute Total Paid (Initial Deposit + Approved TopUps in this cycle)
      const topUps = await tx.foodWalletTopUp.aggregate({
        where: {
          cycleId,
          status: "APPROVED",
        },
        _sum: { amountPaise: true },
      });
      
      const topUpsTotal = topUps._sum.amountPaise || 0;
      
      // The initial foodChargesPaise is only injected into the FIRST billing cycle.
      const previousCyclesCount = await tx.foodBillingCycle.count({
        where: { stayId, cycleStart: { lt: cycle.cycleStart } },
      });
      const isFirstCycle = previousCyclesCount === 0;

      const totalPaidPaise = (isFirstCycle ? stay.foodChargesPaise : 0) + topUpsTotal;

      // 4. Calculate Balance & Outcome
      const balancePaise = totalPaidPaise - consumedPaise;
      let outcome: SettlementOutcome;
      
      if (balancePaise > 0) {
        outcome = SettlementOutcome.REFUND_DUE;
      } else if (balancePaise < 0) {
        outcome = SettlementOutcome.AMOUNT_DUE;
      } else {
        outcome = SettlementOutcome.SETTLED;
      }

      // 5. Create Settlement Statement
      await tx.foodSettlementStatement.create({
        data: {
          stayId,
          cycleId,
          totalConsumedPaise: consumedPaise,
          totalPaidPaise,
          balancePaise,
          outcome,
          createdByUserId: closingUserId,
          notes: `System auto-settlement for cycle ending ${cycle.cycleEnd.toISOString().split('T')[0]}`,
        },
      });

      // 6. Update Cycle
      const closedCycle = await tx.foodBillingCycle.update({
        where: { id: cycleId },
        data: {
          status: "CLOSED",
          totalConsumedPaise: consumedPaise,
          totalPaidPaise,
          settlementPaise: balancePaise,
          closedAt: new Date(),
          closedByUserId: closingUserId,
        },
      });

      // 7. Create next cycle seamlessly, carrying over any positive balance
      await this.generateNextCycleIfNeeded(tx, stay, cycle.cycleEnd, balancePaise > 0 ? balancePaise : 0);

      // (Post-settlement notifications would be triggered async here)
      
      return closedCycle;
    }, { isolationLevel: "Serializable" });
  }

  private static async generateNextCycleIfNeeded(tx: Prisma.TransactionClient, stay: any, lastCycleEnd: Date, carryoverPaise: number) {
    if (stay.status === StayStatus.ACTIVE || stay.status === StayStatus.EXTENDED) {
      if (stay.foodPlan !== FoodPlan.NOT_INCLUDED && stay.foodBillingMode !== FoodBillingMode.FLAT_RATE) {
        // Start the next cycle precisely 1 ms after the old cycle ends to prevent billing gaps.
        const nextCycleStart = new Date(lastCycleEnd.getTime() + 1);
        const nextCycle = await FoodCycleService.createCycleForStay(
          tx,
          stay.id,
          stay.hostel.organizationId,
          stay.hostelId,
          stay.foodBillingMode,
          stay.foodPlan,
          nextCycleStart
        );
        
        if (nextCycle && carryoverPaise > 0) {
          await tx.foodWalletTopUp.create({
            data: {
              stayId: stay.id,
              cycleId: nextCycle.id,
              amountPaise: carryoverPaise,
              status: "APPROVED",
              reason: "Wallet balance carryover from previous cycle",
              transactionRef: "SYSTEM_CARRYOVER"
            }
          });
        }
      }
    }
  }

  /**
   * Driver to settle all OPEN cycles that have expired for a given hostel.
   */
  static async settleHostelCycles(hostelId: string, closingUserId: string) {
    const now = new Date();
    
    // Find all OPEN cycles whose cycleEnd has passed.
    const expiredOpenCycles = await prisma.foodBillingCycle.findMany({
      where: {
        status: "OPEN",
        cycleEnd: { lt: now },
        stay: { hostelId },
      },
      select: { id: true, stayId: true },
    });

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const cycle of expiredOpenCycles) {
      try {
        await this.settleStayCycle(cycle.stayId, cycle.id, closingUserId);
        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push({ stayId: cycle.stayId, cycleId: cycle.id, error: err.message });
      }
    }

    return { successCount, failedCount, errors };
  }
}
