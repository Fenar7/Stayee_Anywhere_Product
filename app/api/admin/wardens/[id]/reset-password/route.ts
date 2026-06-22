import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError, NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createAdminClient } from "@/lib/auth/server";
import { adminResetWardenPasswordSchema } from "@/lib/validation/auth";



export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole([UserRole.MAIN_ADMIN]);
    const wardenId = (await params).id;

    const body = await request.json();
    const data = adminResetWardenPasswordSchema.parse(body);

    const warden = await prisma.warden.findUnique({
      where: { id: wardenId },
      include: {
        user: {
          select: { id: true, supabaseAuthId: true, email: true, phone: true },
        },
      },
    });

    if (!warden) {
      throw new NotFoundError("Warden not found");
    }

    if (!warden.user.supabaseAuthId) {
      throw new ValidationError("Warden has no linked authentication account");
    }

    // Update Supabase Auth password
    const supabase = createAdminClient();
    const { error: authError } = await supabase.auth.admin.updateUserById(
      warden.user.supabaseAuthId,
      { password: data.password }
    );

    if (authError) {
      throw new ConflictError(
        `Failed to update password: ${authError.message}`
      );
    }

    // Update passwordSetAt timestamp
    await prisma.user.update({
      where: { id: warden.user.id },
      data: {
        passwordSetAt: new Date(),
        plainTextPassword: data.password,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
