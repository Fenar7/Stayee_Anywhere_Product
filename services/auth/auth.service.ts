import { prisma } from "@/lib/db";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface LoginResult {
  user: {
    id: string;
    role: UserRole;
    passwordSetAt: Date | null;
  };
  redirectUrl: string;
}

function getRedirectUrl(role: UserRole): string {
  switch (role) {
    case UserRole.MAIN_ADMIN:
      return "/admin";
    case UserRole.WARDEN:
      return "/warden";
    case UserRole.TENANT:
      return "/tenant";
  }
}

export async function authenticateUser(input: LoginInput): Promise<LoginResult> {
  const { identifier } = input;

  const isEmail = identifier.includes("@");
  const where = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };

  const user = await prisma.user.findUnique({ where });

  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  return {
    user: {
      id: user.id,
      role: user.role,
      passwordSetAt: user.passwordSetAt,
    },
    redirectUrl: getRedirectUrl(user.role),
  };
}

export async function fetchUserBySupabaseId(supabaseAuthId: string) {
  const user = await prisma.user.findUnique({
    where: { supabaseAuthId },
    include: { warden: true, tenant: true },
  });

  if (!user) {
    throw new UnauthorizedError("User record not found");
  }

  return user;
}

export async function setUserPasswordSetAt(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordSetAt: new Date(),
    },
  });
}
