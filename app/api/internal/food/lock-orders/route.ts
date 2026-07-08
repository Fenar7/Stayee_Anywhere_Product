import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStartOfDayIST } from "@/lib/dates";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayIST = getStartOfDayIST(new Date());

    const result = await prisma.foodOrder.updateMany({
      where: {
        forDate: todayIST,
        lockedAt: null,
      },
      data: {
        lockedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Daily orders locked successfully",
      lockedCount: result.count,
    });
  } catch (error: any) {
    console.error("Lock Orders Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
