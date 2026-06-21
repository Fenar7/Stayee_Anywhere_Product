import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { ValidationError, ForbiddenError } from "@/lib/errors";
import type { AuthenticatedUserSession } from "@/lib/auth";

/**
 * Resolve the target hostelId for the current session.
 *
 * - WARDEN: returns their assigned hostelId from the database.
 * - MAIN_ADMIN: requires a `hostelId` query param (GET), body field (POST/PUT/PATCH/DELETE),
 *   or the optional fallbackHostelId parameter. Validates that the hostel exists.
 * - TENANT: not supported (throws).
 */
export async function resolveHostelId(
  session: AuthenticatedUserSession,
  request?: NextRequest,
  fallbackHostelId?: string
): Promise<string> {
  const { user } = session;

  if (user.role === UserRole.WARDEN) {
    if (!user.warden) {
      throw new ForbiddenError("Warden account is not provisioned properly");
    }
    return user.warden.hostelId;
  }

  if (user.role === UserRole.MAIN_ADMIN) {
    let hostelId: string | null = fallbackHostelId ?? null;

    if (!hostelId && request) {
      // Try query param first (works for GET)
      const { searchParams } = new URL(request.url);
      hostelId = searchParams.get("hostelId");

      // Fall back to body (for POST/PUT/PATCH/DELETE)
      if (!hostelId) {
        try {
          const cloned = request.clone();
          const body = await cloned.json();
          hostelId = body?.hostelId ?? null;
        } catch {
          // No body or invalid JSON — that's fine
        }
      }
    }

    if (!hostelId) {
      throw new ValidationError("Hostel parameter is required for Admin");
    }

    // Validate the hostel exists
    const hostel = await prisma.hostel.findUnique({
      where: { id: hostelId },
      select: { id: true },
    });

    if (!hostel) {
      throw new ValidationError("Hostel not found");
    }

    console.info(`[Audit] Main Admin ${user.id} accessing hostel ${hostelId} as warden`);
    return hostelId;
  }

  throw new ForbiddenError("Only Wardens and Main Admins can perform this action");
}
