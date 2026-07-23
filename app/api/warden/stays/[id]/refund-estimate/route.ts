import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { differenceInCalendarDays, isBefore, isAfter } from "date-fns";

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
    const endDate = stay.endDate ? new Date(stay.endDate) : new Date();
    
    if (isBefore(exitDate, joiningDate)) {
      return NextResponse.json({ error: "Exit date cannot be before joining date" }, { status: 400 });
    }
    
    if (stay.endDate && isAfter(exitDate, endDate)) {
      return NextResponse.json({ error: "Exit date cannot be after current end date" }, { status: 400 });
    }

    const daysUsed = differenceInCalendarDays(exitDate, joiningDate);
    const daysRemaining = stay.endDate ? Math.max(0, differenceInCalendarDays(endDate, exitDate)) : 0;

    // Prorate monthly rent per day
    const rentPerDay = stay.monthlyRentPaise / 30;
    const suggestedRefund = Math.max(0, Math.floor(daysRemaining * rentPerDay));

    return NextResponse.json({
      daysUsed,
      daysRemaining,
      suggestedRefund,
    });
  } catch (error: unknown) {
    console.error("Refund estimate error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
