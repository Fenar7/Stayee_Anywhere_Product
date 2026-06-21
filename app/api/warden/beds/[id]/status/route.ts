import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { UserRole, BedStatus } from "@prisma/client";
import { updateBedStatus } from "@/services/hostel/structure.service";

const updateBedStatusSchema = z.object({
  status: z.nativeEnum(BedStatus),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole([UserRole.WARDEN]);
    const { id } = await params;

    if (!user.warden) {
      throw new ForbiddenError("Warden account is not provisioned properly");
    }

    const body = await request.json();
    const { status } = updateBedStatusSchema.parse(body);

    const result = await updateBedStatus(id, status, user.warden.hostelId);

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
