import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/auth/server";
import { requireRole } from "@/lib/auth";
import { authorizePasswordReset, resetPasswordViaAdmin } from "@/services/auth/password.service";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { rateLimit } from "@/lib/rate-limit";

const resetPasswordSchema = z.object({
  targetUserId: z.string().uuid(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown-ip";
    const rl = rateLimit(`reset_pwd_${ip}`, { limit: 10, windowMs: 60 * 1000 });
    
    if (!rl.success) {
      return Response.json(
        { error: "Too many password reset attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": Math.ceil((rl.resetTime - Date.now()) / 1000).toString() } }
      );
    }
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
