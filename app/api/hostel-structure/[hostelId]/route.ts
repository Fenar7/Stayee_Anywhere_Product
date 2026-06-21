import { NextRequest } from "next/server";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { getFullHierarchy } from "@/services/hostel/structure.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hostelId: string }> }
) {
  try {
    const { hostelId } = await params;
    const { user } = await requireRole([UserRole.MAIN_ADMIN, UserRole.WARDEN]);
    await requireHostelAccess({ user }, hostelId);

    const hierarchy = await getFullHierarchy(hostelId);
    return Response.json(hierarchy);
  } catch (error) {
    return handleApiError(error);
  }
}
