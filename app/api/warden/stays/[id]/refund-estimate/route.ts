import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { id } = await params;
    
    const searchParams = request.nextUrl.searchParams;
    const exitDateParam = searchParams.get("exitDate");
    
    if (!exitDateParam) {
      return NextResponse.json({ error: "Missing exitDate" }, { status: 400 });
    }

    const exitDate = new Date(exitDateParam);
    if (isNaN(exitDate.getTime())) {
      return NextResponse.json({ error: "Invalid exitDate" }, { status: 400 });
    }

    const stay = await prisma.stay.findUnique({
      where: { id },
    });

    if (!stay) {
      return NextResponse.json({ error: "Stay not found" }, { status: 404 });
    }

    // Auth check: Warden can only access their hostel's stays
    if (user.role === UserRole.WARDEN && stay.hostelId !== user.warden?.hostelId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const joiningDate = new Date(stay.joiningDate);
    const endDate = new Date(stay.endDate);
    
    const usedDurationMs = exitDate.getTime() - joiningDate.getTime();
    const daysUsed = Math.max(0, Math.ceil(usedDurationMs / (1000 * 60 * 60 * 24)));
    
    const remainingDurationMs = endDate.getTime() - exitDate.getTime();
    const daysRemaining = Math.max(0, Math.ceil(remainingDurationMs / (1000 * 60 * 60 * 24)));

    // Prorate monthly rent per day
    const rentPerDay = stay.monthlyRentPaise / 30;
    const suggestedRefund = Math.max(0, Math.floor(daysRemaining * rentPerDay));

    return NextResponse.json({
      daysUsed,
      daysRemaining,
      suggestedRefund,
    });
  } catch (error: any) {
    console.error("Refund estimate error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
