import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStartOfDayIST } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayIST = getStartOfDayIST(new Date());
    const now = new Date();

    const { count } = await prisma.foodOrder.updateMany({
      where: {
        forDate: { lte: todayIST },
        lockedAt: null,
      },
      data: {
        lockedAt: now,
      },
    });

    return NextResponse.json({
      message: "Daily orders locked successfully",
      lockedCount: count,
    });
  } catch (error: any) {
    console.error("Lock Orders Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
