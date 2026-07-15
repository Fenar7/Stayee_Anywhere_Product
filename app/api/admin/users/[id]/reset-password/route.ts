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

    let customPassword = undefined;
    try {
      const body = await request.json();
      customPassword = body?.customPassword;
    } catch {
      // ignore empty body
    }

    if (customPassword && customPassword.length < 6) {
      throw new ValidationError("Custom password must be at least 6 characters long.");
    }

    // Use custom password or generate a secure random password
    const tempPassword = customPassword || (crypto.randomBytes(4).toString("hex") + "A1!");

    const supabase = createAdminClient();
    
    let activeSupabaseAuthId = user.supabaseAuthId;

    // Helper to create a brand new Supabase Auth user if missing, or link to an orphaned one
    const createAuthUser = async () => {
      const { data, error } = await supabase.auth.admin.createUser({
        phone: user.phone,
        email: user.email?.toLowerCase() || undefined,
        password: tempPassword,
        phone_confirm: true,
        email_confirm: !!user.email,
      });

      if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
          // It's an orphaned user. Let's find them by phone and just update their password.
          const { data: listData } = await supabase.auth.admin.listUsers();
          const orphanedUser = listData?.users?.find(
            (u: any) => u.phone === user.phone || u.phone === user.phone.replace(/^\+/, "")
          );

          if (orphanedUser) {
            const { error: updateError } = await supabase.auth.admin.updateUserById(
              orphanedUser.id,
              { password: tempPassword }
            );
            if (updateError) throw new ConflictError(`Failed to update orphaned user password: ${updateError.message}`);
            return orphanedUser.id;
          }
        }
        throw new ConflictError(`Failed to create missing auth user: ${error.message}`);
      }

      return data.user.id;
    };

    if (!activeSupabaseAuthId) {
      // Scenario 1: User never had an auth account
      activeSupabaseAuthId = await createAuthUser();
    } else {
      // Scenario 2: User has an auth account, try updating it
      const { error: authError } = await supabase.auth.admin.updateUserById(
        activeSupabaseAuthId,
        { password: tempPassword }
      );

      // Scenario 3: The auth account was deleted manually in Supabase dashboard
      if (authError && authError.message.toLowerCase().includes("user not found")) {
        activeSupabaseAuthId = await createAuthUser();
      } else if (authError) {
        throw new ConflictError(`Failed to update password: ${authError.message}`);
      }
    }

    // Update passwordSetAt timestamp and the (possibly new) supabaseAuthId
    await prisma.user.update({
      where: { id: user.id },
      data: {
        supabaseAuthId: activeSupabaseAuthId,
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
