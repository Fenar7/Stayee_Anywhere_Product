import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { FoodBalanceService } from "@/services/food/balance.service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);

    // Find the active stay for the tenant
    const stay = await prisma.stay.findFirst({
      where: {
        tenantId: session.user.id,
        status: { in: ["ACTIVE", "EXTENDED"] },
      },
      orderBy: { joiningDate: "desc" },
    });

    if (!stay) {
      throw new NotFoundError("No active stay found");
    }

    // Get the active cycle
    const currentCycle = await prisma.foodBillingCycle.findFirst({
      where: { stayId: stay.id, status: "OPEN" },
      orderBy: { cycleStart: "desc" },
    });

    let walletBalance = null;
    let dailyBreakdown: any[] = [];

    if (currentCycle && stay.foodBillingMode !== "FLAT_RATE") {
      // 1. Get Wallet Balance summary
      walletBalance = await FoodBalanceService.computeWalletBalance(stay.id, currentCycle.id);

      // 2. Build detailed Daily Breakdown
      const orders = await prisma.foodOrder.findMany({
        where: {
          stayId: stay.id,
          forDate: { gte: currentCycle.cycleStart, lte: currentCycle.cycleEnd },
        },
        orderBy: { forDate: "desc" },
      });

      dailyBreakdown = orders.map((order) => {
        let dailyTotal = 0;
        if (order.breakfast) dailyTotal += currentCycle.breakfastPricePaise;
        if (order.lunch) dailyTotal += currentCycle.lunchPricePaise;
        if (order.dinner) dailyTotal += currentCycle.dinnerPricePaise;

        return {
          forDate: order.forDate.toISOString(),
          breakfast: order.breakfast,
          lunch: order.lunch,
          dinner: order.dinner,
          dailyTotalPaise: dailyTotal,
        };
      });
    }

    // Get settlement history
    const settlementHistory = await prisma.foodSettlementStatement.findMany({
      where: { stayId: stay.id },
      orderBy: { createdAt: "desc" },
      include: { cycle: true },
    });

    const payload = {
      stay: {
        id: stay.id,
        foodBillingMode: stay.foodBillingMode,
        foodPlan: stay.foodPlan,
      },
      currentCycle: currentCycle
        ? {
            id: currentCycle.id,
            cycleStart: currentCycle.cycleStart.toISOString(),
            cycleEnd: currentCycle.cycleEnd.toISOString(),
            breakfastPricePaise: currentCycle.breakfastPricePaise,
            lunchPricePaise: currentCycle.lunchPricePaise,
            dinnerPricePaise: currentCycle.dinnerPricePaise,
          }
        : null,
      walletBalance,
      dailyBreakdown,
      settlementHistory: settlementHistory.map((s) => ({
        id: s.id,
        cycleStart: s.cycle.cycleStart.toISOString(),
        cycleEnd: s.cycle.cycleEnd.toISOString(),
        outcome: s.outcome,
        totalPaidPaise: s.totalPaidPaise,
        totalConsumedPaise: s.totalConsumedPaise,
        balancePaise: s.balancePaise,
        createdAt: s.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
