import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireHostelAccess, AuthenticatedUserSession } from "@/lib/auth";
import { getWardenHostelStats } from "@/services/hostel/dashboard.service";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    await requireHostelAccess(session, session.user.warden!.hostelId);
    const stats = await getWardenHostelStats(session.user.warden!.hostelId);
    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError(error);
  }
}