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

    const pendingTopUps = await prisma.foodWalletTopUp.findMany({
      where: {
        status: "PENDING",
        stay: { hostelId },
      },
      include: {
        stay: {
          include: {
            tenant: { select: { fullName: true } },
            bed: { select: { label: true, room: { select: { roomNumber: true } } } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const mapped = pendingTopUps.map((t) => ({
      id: t.id,
      stayId: t.stayId,
      tenantName: t.stay?.tenant?.fullName || "Unknown",
      roomNumber: t.stay?.bed?.room?.roomNumber || "N/A",
      bedLabel: t.stay?.bed?.label || "N/A",
      amountPaise: t.amountPaise,
      createdAt: t.createdAt.toISOString(),
      reason: t.reason,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return handleApiError(error);
  }
}
