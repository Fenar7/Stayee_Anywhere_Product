import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { FoodBalanceService } from "@/services/food/balance.service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const hostelId = await resolveHostelId(session, request);
    await requireHostelAccess(session, hostelId);

    const summary = await FoodBalanceService.computeHostelFoodSummary(hostelId);

    return NextResponse.json(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
