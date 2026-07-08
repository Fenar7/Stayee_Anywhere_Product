import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FoodSettlementService } from "@/services/food/settlement.service";

// We use the system user ID for auto-generated settlements
const SYSTEM_USER_ID = "SYSTEM_CRON";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    
    // Find all hostels that have at least one expired open cycle
    const hostelsWithExpiredCycles = await prisma.stay.findMany({
      where: {
        foodBillingCycles: {
          some: {
            status: "OPEN",
            cycleEnd: { lt: now },
          },
        },
      },
      select: { hostelId: true },
      distinct: ["hostelId"],
    });

    const results = [];

    for (const stay of hostelsWithExpiredCycles) {
      const hostelResult = await FoodSettlementService.settleHostelCycles(stay.hostelId, SYSTEM_USER_ID);
      results.push({ hostelId: stay.hostelId, ...hostelResult });
    }

    return NextResponse.json({
      message: "Cron cycle settlement complete",
      results,
    });
  } catch (error: any) {
    console.error("Cron Settlement Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
