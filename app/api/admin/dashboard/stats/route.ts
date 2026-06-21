import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminPortfolioStats } from "@/services/hostel/dashboard.service";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireRole([UserRole.MAIN_ADMIN]);
    const stats = await getAdminPortfolioStats();
    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError(error);
  }
}