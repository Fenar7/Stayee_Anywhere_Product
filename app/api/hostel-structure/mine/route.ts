import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { getFullHierarchy } from "@/services/hostel/structure.service";

export async function GET() {
  try {
    const { user } = await requireRole([UserRole.WARDEN]);
    if (!user.warden) {
      return Response.json({ error: "Warden account not provisioned", code: "FORBIDDEN" }, { status: 403 });
    }
    const hierarchy = await getFullHierarchy(user.warden.hostelId);
    return Response.json(hierarchy);
  } catch (error) {
    return handleApiError(error);
  }
}
