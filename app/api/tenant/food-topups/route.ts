import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);

    // 1. Get Active Stay
    const stay = await prisma.stay.findFirst({
      where: {
        tenantId: session.user.id,
        status: { in: ["ACTIVE", "EXTENDED"] },
      },
      orderBy: { joiningDate: "desc" },
    });

    if (!stay) {
      throw new NotFoundError("No active stay found");
    }

    // 2. Fetch topups for this stay
    const topUps = await prisma.foodWalletTopUp.findMany({
      where: { stayId: stay.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(topUps);
  } catch (error) {
    return handleApiError(error);
  }
}
