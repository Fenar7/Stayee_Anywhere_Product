import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { UserRole, LeadStatus } from "@prisma/client";
import { getLeadById, updateLead } from "@/services/leads/lead.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { user } = session;
    const { id } = await params;

    const lead = await getLeadById(id);

    if (user.role === UserRole.WARDEN) {
      const hostelId = await resolveHostelId(session);
      if (lead.hostelId !== null && lead.hostelId !== hostelId) {
        throw new ForbiddenError("Access denied: Lead does not belong to your hostel");
      }
    }

    return NextResponse.json({ lead });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { user } = session;
    const { id } = await params;

    const lead = await getLeadById(id);

    if (user.role === UserRole.WARDEN) {
      const hostelId = await resolveHostelId(session);
      if (lead.hostelId !== null && lead.hostelId !== hostelId) {
        throw new ForbiddenError("Access denied: Lead does not belong to your hostel");
      }
    }

    const body = await request.json();
    const { status, note } = body;

    const author = user.role === UserRole.MAIN_ADMIN ? "Admin" : "Warden";

    if (status !== undefined && !Object.values(LeadStatus).includes(status)) {
      throw new NotFoundError(`Invalid status: ${status}`);
    }

    if (status === undefined && note === undefined) {
      return NextResponse.json({ lead });
    }

    const updatedLead = await updateLead(id, {
      status: status !== undefined ? status : lead.status,
      notes: note,
      author,
    });

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    return handleApiError(error);
  }
}
