import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.TENANT]);
    const { id } = await params;
    const body = await request.json();
    const { read, dismissedFromHome } = body;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== session.user.id) {
      throw new NotFoundError("Notification not found");
    }

    const data: any = {};
    if (read !== undefined) data.read = read;
    if (dismissedFromHome !== undefined) data.dismissedFromHome = dismissedFromHome;

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, notification: updatedNotification });
  } catch (error) {
    return handleApiError(error);
  }
}
