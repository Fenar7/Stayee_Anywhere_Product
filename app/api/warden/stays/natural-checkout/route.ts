import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { processNaturalCheckouts } from "@/services/stays/natural-checkout";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const hostelId = await resolveHostelId(session, request);

    const result = await processNaturalCheckouts({ hostelId });

    return NextResponse.json({
      success: true,
      checkedOutCount: result.checkedOutCount,
      stayIds: result.stayIds,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
