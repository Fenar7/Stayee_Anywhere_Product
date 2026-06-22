import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError } from "@/lib/errors";
import { UserRole, BedStatus } from "@prisma/client";
import { updateBedStatus } from "@/services/hostel/structure.service";
import { updateBedStatusSchema } from "@/lib/validation/hostel";



export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const hostelId = await resolveHostelId(session, request);
    const { id } = await params;

    const body = await request.json();
    const { status } = updateBedStatusSchema.parse(body);

    const result = await updateBedStatus(id, status, hostelId);

    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
