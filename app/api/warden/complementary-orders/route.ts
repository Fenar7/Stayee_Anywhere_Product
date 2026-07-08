import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const hostelId = await resolveHostelId(session, request);
    await requireHostelAccess(session, hostelId);

    const orders = await prisma.complementaryFoodOrder.findMany({
      where: { hostelId },
      include: {
        createdByUser: { select: { email: true, phone: true } },
      },
      orderBy: { forDate: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    return handleApiError(error);
  }
}
