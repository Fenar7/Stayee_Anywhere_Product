import { prisma } from "@/lib/db";
import { StayStatus, FoodBillingMode, FoodPlan } from "@prisma/client";

export interface TenantBalanceResult {
  stayId: string;
  tenantName: string;
  roomName: string;
  billingMode: FoodBillingMode;
  foodPlan: FoodPlan;
  cycleId: string | null;
  totalPaidPaise: number;
  totalConsumedPaise: number;
  balancePaise: number;
}

export interface HostelFoodSummary {
  hostelId: string;
  cyclePeriod: { start: Date; end: Date } | null;
  totalRevenuePaise: number;
  totalConsumedPaise: number;
  netPositionPaise: number;
  tenantsInCredit: TenantBalanceResult[];
  tenantsInDebt: TenantBalanceResult[];
  flatRateTenants: TenantBalanceResult[];
}

export class FoodBalanceService {
  /**
   * Computes the real-time wallet balance for a single stay.
   */
  static async computeWalletBalance(
    stayId: string,
    cycleId?: string
  ): Promise<TenantBalanceResult | null> {
    const results = await this.computeWalletBalancesForStays([stayId], cycleId);
    return results.get(stayId) || null;
  }

  /**
   * Batch computes the real-time wallet balances for multiple stays to prevent N+1 queries.
   */
  static async computeWalletBalancesForStays(
    stayIds: string[],
    explicitCycleId?: string
  ): Promise<Map<string, TenantBalanceResult>> {
    const resultMap = new Map<string, TenantBalanceResult>();
    if (stayIds.length === 0) return resultMap;

    // 1. Fetch stays
    const stays = await prisma.stay.findMany({
      where: { id: { in: stayIds } },
      include: {
        tenant: true,
        bed: { include: { room: true } },
      },
    });

    // 2. Fetch cycles
    let cycles = [];
    if (explicitCycleId) {
      cycles = await prisma.foodBillingCycle.findMany({
        where: { id: explicitCycleId, stayId: { in: stayIds } },
      });
    } else {
      // Fetch latest OPEN cycle for each stay
      const allOpenCycles = await prisma.foodBillingCycle.findMany({
        where: { stayId: { in: stayIds }, status: "OPEN" },
        orderBy: { cycleStart: "desc" },
      });
      // Deduplicate to get the latest per stay
      const cycleMap = new Map();
      for (const c of allOpenCycles) {
        if (!cycleMap.has(c.stayId)) {
          cycleMap.set(c.stayId, c);
          cycles.push(c);
        }
      }
    }

    const cycleIdMap = new Map(cycles.map(c => [c.id, c]));
    const stayToCycleMap = new Map(cycles.map(c => [c.stayId, c]));
    const cycleIds = cycles.map(c => c.id);

    // 3. Fetch top-ups in batch
    let topUpSums = new Map<string, number>(); // cycleId -> totalAmount
    if (cycleIds.length > 0) {
      const topUps = await prisma.foodWalletTopUp.groupBy({
        by: ['cycleId'],
        where: {
          cycleId: { in: cycleIds },
          status: "APPROVED",
        },
        _sum: { amountPaise: true },
      });
      for (const t of topUps) {
        topUpSums.set(t.cycleId, t._sum.amountPaise || 0);
      }
    }

    // 4. Fetch food orders in batch
    // We need to fetch orders that fall within each stay's active cycle bounds.
    // Instead of complex OR queries, we can just fetch all orders for the month and filter in memory,
    // or build a clean OR query. Let's do an OR query for exact bounds.
    let orders: any[] = [];
    const orConditions = cycles.map(c => ({
      stayId: c.stayId,
      forDate: { gte: c.cycleStart, lte: c.cycleEnd },
    }));

    if (orConditions.length > 0) {
      orders = await prisma.foodOrder.findMany({
        where: { OR: orConditions },
      });
    }

    // 5. Aggregate
    for (const stay of stays) {
      const cycle = stayToCycleMap.get(stay.id);

      if (!cycle) {
        resultMap.set(stay.id, {
          stayId: stay.id,
          tenantName: stay.tenant.fullName || "Unknown",
          roomName: stay.bed.room.roomNumber,
          billingMode: stay.foodBillingMode,
          foodPlan: stay.foodPlan,
          cycleId: null,
          totalPaidPaise: stay.foodChargesPaise,
          totalConsumedPaise: 0,
          balancePaise: 0,
        });
        continue;
      }

      const totalTopUp = topUpSums.get(cycle.id) || 0;
      const totalPaidPaise = stay.foodChargesPaise + totalTopUp;

      let totalConsumedPaise = 0;
      for (const order of orders) {
        if (order.stayId === stay.id && order.forDate >= cycle.cycleStart && order.forDate <= cycle.cycleEnd) {
          if (order.breakfast) totalConsumedPaise += cycle.breakfastPricePaise;
          if (order.lunch) totalConsumedPaise += cycle.lunchPricePaise;
          if (order.dinner) totalConsumedPaise += cycle.dinnerPricePaise;
        }
      }

      const balancePaise = totalPaidPaise - totalConsumedPaise;

      resultMap.set(stay.id, {
        stayId: stay.id,
        tenantName: stay.tenant.fullName || "Unknown",
        roomName: stay.bed.room.name,
        billingMode: stay.foodBillingMode,
        foodPlan: stay.foodPlan,
        cycleId: cycle.id,
        totalPaidPaise,
        totalConsumedPaise,
        balancePaise,
      });
    }

    return resultMap;
  }

  /**
   * Batch computes the food summary for all active stays in a hostel.
   */
  static async computeHostelFoodSummary(
    hostelId: string
  ): Promise<HostelFoodSummary> {
    const activeStays = await prisma.stay.findMany({
      where: {
        hostelId,
        status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
        foodPlan: { not: FoodPlan.NOT_INCLUDED },
      },
      select: { id: true },
    });

    const stayIds = activeStays.map(s => s.id);
    const balances = await this.computeWalletBalancesForStays(stayIds);

    const tenantsInCredit: TenantBalanceResult[] = [];
    const tenantsInDebt: TenantBalanceResult[] = [];
    const flatRateTenants: TenantBalanceResult[] = [];
    let totalRevenuePaise = 0;
    let totalConsumedPaise = 0;

    let representativeCycleStart: Date | null = null;
    let representativeCycleEnd: Date | null = null;

    for (const [id, balance] of Array.from(balances.entries())) {
      if (balance.billingMode === FoodBillingMode.FLAT_RATE) {
        flatRateTenants.push(balance);
      } else {
        totalRevenuePaise += balance.totalPaidPaise;
        totalConsumedPaise += balance.totalConsumedPaise;

        if (balance.balancePaise >= 0) {
          tenantsInCredit.push(balance);
        } else {
          tenantsInDebt.push(balance);
        }
      }
    }

    // Sort by name
    tenantsInCredit.sort((a, b) => a.tenantName.localeCompare(b.tenantName));
    tenantsInDebt.sort((a, b) => a.balancePaise - b.balancePaise); // Sort by largest debt first (most negative)
    flatRateTenants.sort((a, b) => a.tenantName.localeCompare(b.tenantName));

    const netPositionPaise = totalRevenuePaise - totalConsumedPaise;

    // Figure out the representative cycle for the top card.
    // If it's the start of the month, most tenants will have the same bounds. Let's just calculate the current month bounds.
    // That solves the "Cycle Bounds Assumption" flag perfectly without extra queries.
    const now = new Date();
    // Offset for IST (UTC+5:30)
    const nowIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const startOfMonth = new Date(nowIST.getFullYear(), nowIST.getMonth(), 1);
    const endOfMonth = new Date(nowIST.getFullYear(), nowIST.getMonth() + 1, 0);

    return {
      hostelId,
      cyclePeriod: { start: startOfMonth, end: endOfMonth },
      totalRevenuePaise,
      totalConsumedPaise,
      netPositionPaise,
      tenantsInCredit,
      tenantsInDebt,
      flatRateTenants,
    };
  }
}
