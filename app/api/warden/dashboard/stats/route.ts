import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { getWardenHostelStats } from "@/services/hostel/dashboard.service";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const hostelId = await resolveHostelId(session, request);
    const stats = await getWardenHostelStats(hostelId);
    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError(error);
  }
}