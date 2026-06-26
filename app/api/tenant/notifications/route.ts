import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);
    const body = await request.json();
    const { read, dismissedFromHome } = body;

    const data: any = {};
    if (read !== undefined) data.read = read;
    if (dismissedFromHome !== undefined) data.dismissedFromHome = dismissedFromHome;

    const updated = await prisma.notification.updateMany({
      where: { userId: session.user.id },
      data,
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (error) {
    return handleApiError(error);
  }
}
