import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { getFullHierarchy } from "@/services/hostel/structure.service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const hostelId = await resolveHostelId(session, request);
    const hierarchy = await getFullHierarchy(hostelId);
    return Response.json(hierarchy);
  } catch (error) {
    return handleApiError(error);
  }
}
