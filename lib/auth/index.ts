import { createClient } from "./server";
import { prisma } from "../db";
import { UnauthorizedError, ForbiddenError } from "../errors";
import { User, UserRole, Warden, Tenant } from "@prisma/client";

export interface AuthenticatedUserSession {
  user: User & {
    warden: Warden | null;
    tenant: Tenant | null;
  };
}

/**
 * Verifies the current session and ensures the user has one of the allowed roles.
 * Returns the authenticated user record from the database.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthenticatedUserSession> {
  const supabase = await createClient();
  const { data: { user: authUser }, error } = await supabase.auth.getUser();

  if (error || !authUser) {
    throw new UnauthorizedError("Session invalid or expired");
  }

  // Look up the user in our database including role-specific records
  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    include: {
      warden: true,
      tenant: true,
    },
  });

  if (!dbUser) {
    throw new UnauthorizedError("User record not found in system database");
  }

  if (dbUser.role === UserRole.MAIN_ADMIN) {
    // MAIN_ADMIN is a superuser and can access any route/role in the system
    return { user: dbUser };
  }

  if (!allowedRoles.includes(dbUser.role)) {
    throw new ForbiddenError(`Access denied: requires one of the roles [${allowedRoles.join(", ")}]`);
  }

  return { user: dbUser };
}

/**
 * Restricts access to a specific hostelId.
 * Main Admin bypasses checks.
 * Wardens are restricted to their assigned hostelId.
 * Tenants are restricted to their stay's hostelId.
 */
export async function requireHostelAccess(
  session: AuthenticatedUserSession,
  hostelId: string
): Promise<void> {
  const { user } = session;

  if (user.role === UserRole.MAIN_ADMIN) {
    // MAIN_ADMIN bypasses hostel scoping by design — log bypass for audit
    console.info(`[Audit] Main Admin ${user.id} bypassed hostel scoping check for hostel ${hostelId}`);
    return;
  }

  if (user.role === UserRole.WARDEN) {
    if (!user.warden) {
      throw new ForbiddenError("Warden account is not provisioned properly");
    }
    if (user.warden.hostelId !== hostelId) {
      throw new ForbiddenError("Access denied: Warden is not authorized to manage this hostel");
    }
    return;
  }

  if (user.role === UserRole.TENANT) {
    if (!user.tenant) {
      throw new ForbiddenError("Tenant profile is not provisioned properly");
    }
    // Check if tenant has an active stay in this hostel
    const activeStay = await prisma.stay.findFirst({
      where: {
        tenantId: user.tenant.id,
        hostelId: hostelId,
        status: {
          in: ["ACTIVE", "EXTENDED"],
        },
      },
    });

    if (!activeStay) {
      throw new ForbiddenError("Access denied: Tenant is not currently residing in this hostel");
    }
    return;
  }

  throw new ForbiddenError("Invalid user role for hostel access check");
}
