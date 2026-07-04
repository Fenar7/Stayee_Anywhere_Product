import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, ValidationError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);
    const body = await request.json();

    const { currentPassword, password } = body;

    if (!currentPassword) {
      throw new ValidationError("Current password is required");
    }

    if (!password || password.length < 6) {
      throw new ValidationError("New password must be at least 6 characters long");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plainTextPassword: true },
    });

    if (!user || user.plainTextPassword !== currentPassword) {
      throw new ValidationError("Incorrect current password");
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        plainTextPassword: password,
        passwordSetAt: new Date()
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
