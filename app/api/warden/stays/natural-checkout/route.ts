import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { processNaturalCheckouts } from "@/services/stays/natural-checkout";

export async function POST() {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const warden = session.user.warden!;
    const hostelId = warden.hostelId;

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
