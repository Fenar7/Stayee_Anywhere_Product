import { prisma } from "@/lib/db";
import { getEndOfDayIST } from "@/lib/dates";
import { StayStatus, BedStatus, Prisma } from "@prisma/client";
import { FoodSettlementService } from "../food/settlement.service";

export interface NaturalCheckoutResult {
  checkedOutCount: number;
  stayIds: string[];
}

export interface NaturalCheckoutParams {
  hostelId?: string;
}

/**
 * Scans for stays whose endDate has passed (relative to IST today)
 * and transitions them from ACTIVE/EXTENDED → CHECKED_OUT, freeing the beds.
 * This is the "natural checkout path" required by the PRD.
 */
export async function processNaturalCheckouts(params?: NaturalCheckoutParams): Promise<NaturalCheckoutResult> {
  const endOfTodayIST = getEndOfDayIST();

  const whereClause: Prisma.StayWhereInput = {
    status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
    endDate: { lte: endOfTodayIST },
  };

  if (params?.hostelId) {
    whereClause.hostelId = params.hostelId;
  }

  const expiredStays = await prisma.stay.findMany({
    where: whereClause,
    select: { id: true, bedId: true, endDate: true, status: true },
  });

  if (expiredStays.length === 0) {
    return { checkedOutCount: 0, stayIds: [] };
  }

  for (const stay of expiredStays) {
    let openCycleId: string | undefined;

    await prisma.$transaction(async (tx) => {
      await tx.stay.update({
        where: { id: stay.id },
        data: { status: StayStatus.CHECKED_OUT },
      });

      await tx.bed.update({
        where: { id: stay.bedId },
        data: { status: BedStatus.AVAILABLE },
      });

      await tx.stayStatusEvent.create({
        data: {
          stayId: stay.id,
          fromStatus: stay.status,
          toStatus: StayStatus.CHECKED_OUT,
          changedByUserId: "system",
          note: `Stay naturally expired on ${stay.endDate.toISOString().split("T")[0]}. Bed released.`,
        },
      });

      const openCycle = await tx.foodBillingCycle.findFirst({
        where: { stayId: stay.id, status: "OPEN" },
      });

      if (openCycle) {
        await tx.foodBillingCycle.update({
          where: { id: openCycle.id },
          data: { cycleEnd: stay.endDate },
        });
        openCycleId = openCycle.id;
      }
    });

    if (openCycleId) {
      await FoodSettlementService.settleStayCycle(stay.id, openCycleId, "system");
    }
  }

  return {
    checkedOutCount: expiredStays.length,
    stayIds: expiredStays.map((s) => s.id),
  };
}
