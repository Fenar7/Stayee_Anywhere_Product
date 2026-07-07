import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { FoodSettlementService } from "@/services/food/settlement.service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const hostelId = await resolveHostelId(session, request);
    await requireHostelAccess(session, hostelId);

    const result = await FoodSettlementService.settleHostelCycles(hostelId, session.user.id);

    return NextResponse.json({
      message: "Cycle closure and settlement complete",
      ...result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
