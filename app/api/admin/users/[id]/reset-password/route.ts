import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError, NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createAdminClient } from "@/lib/auth/server";
import crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);
    const userId = (await params).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.organizationId !== session.user.organizationId) {
      throw new NotFoundError("User not found or access denied");
    }

    if (!user.supabaseAuthId) {
      throw new ValidationError("User has no linked authentication account");
    }

    // Generate a secure random password
    const tempPassword = crypto.randomBytes(4).toString("hex") + "A1!";

    // Update Supabase Auth password
    const supabase = createAdminClient();
    const { error: authError } = await supabase.auth.admin.updateUserById(
      user.supabaseAuthId,
      { password: tempPassword }
    );

    if (authError) {
      throw new ConflictError(
        `Failed to update password: ${authError.message}`
      );
    }

    // Update passwordSetAt timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordSetAt: new Date(),
        plainTextPassword: tempPassword,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
      tempPassword,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
