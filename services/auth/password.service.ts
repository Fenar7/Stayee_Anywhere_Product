import { prisma } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { createAdminClient } from "@/lib/auth/server";
import { UserRole } from "@prisma/client";

export interface PasswordResetTarget {
  targetUserId: string;
}

async function validateWardenCanReset(wardenUserId: string, targetUserId: string): Promise<void> {
  const warden = await prisma.warden.findUnique({
    where: { userId: wardenUserId },
    include: { hostel: true },
  });

  if (!warden) {
    throw new ForbiddenError("Warden account is not provisioned properly");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { tenant: { include: { stays: { take: 1 } } } },
  });

  if (!targetUser) {
    throw new NotFoundError("Target user not found");
  }

  if (targetUser.role !== UserRole.TENANT) {
    throw new ForbiddenError("Wardens can only reset passwords for tenants");
  }

  if (!targetUser.tenant) {
    throw new ForbiddenError("Target user does not have a tenant profile");
  }

  const tenantStay = await prisma.stay.findFirst({
    where: {
      tenantId: targetUser.tenant.id,
      hostelId: warden.hostelId,
      status: { in: ["ONBOARDING_PENDING", "APPROVED_AWAITING_PAYMENT", "ACTIVE", "EXTENDED"] },
    },
  });

  if (!tenantStay) {
    throw new ForbiddenError("Target tenant does not belong to your hostel");
  }
}

export async function authorizePasswordReset(actorUserId: string, actorRole: UserRole, targetUserId: string): Promise<void> {
  if (actorRole === UserRole.MAIN_ADMIN) {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundError("Target user not found");
    }
    return;
  }

  if (actorRole === UserRole.WARDEN) {
    await validateWardenCanReset(actorUserId, targetUserId);
    return;
  }

  throw new ForbiddenError("You are not authorized to reset passwords");
}

export async function resetPasswordViaAdmin(targetUserId: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(user.supabaseAuthId, { password: newPassword });

  if (error) {
    throw new Error(`Failed to reset password: ${error.message}`);
  }
}
