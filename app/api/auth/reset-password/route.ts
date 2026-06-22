import { NextRequest } from "next/server";
import { createClient } from "@/lib/auth/server";
import { requireRole } from "@/lib/auth";
import { authorizePasswordReset, resetPasswordViaAdmin } from "@/services/auth/password.service";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { resetPasswordSchema } from "@/lib/validation/auth";



export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetUserId, newPassword } = resetPasswordSchema.parse(body);

    const { user } = await requireRole([UserRole.MAIN_ADMIN, UserRole.WARDEN]);
    await authorizePasswordReset(user.id, user.role, targetUserId);
    await resetPasswordViaAdmin(targetUserId, newPassword);

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
