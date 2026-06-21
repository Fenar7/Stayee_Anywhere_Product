import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { UserRole, LeadStatus } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const { user } = session;
    const { id } = await params;

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundError("Lead not found");
    }

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
    const session = await requireRole([UserRole.WARDEN]);
    const { user } = session;
    const { id } = await params;

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundError("Lead not found");
    }

    if (user.role === UserRole.WARDEN) {
      const hostelId = await resolveHostelId(session);
      if (lead.hostelId !== null && lead.hostelId !== hostelId) {
        throw new ForbiddenError("Access denied: Lead does not belong to your hostel");
      }
    }

    const body = await request.json();
    const { status, note } = body;

    const updateData: { status?: LeadStatus; notes?: string } = {};

    if (status !== undefined) {
      if (!Object.values(LeadStatus).includes(status)) {
        throw new NotFoundError(`Invalid status: ${status}`);
      }
      updateData.status = status;
    }

    if (note !== undefined && typeof note === "string" && note.trim().length > 0) {
      let parsedNotes: Array<{ text: string; createdAt: string; author: string }> = [];
      try {
        if (lead.notes) {
          parsedNotes = JSON.parse(lead.notes);
          if (!Array.isArray(parsedNotes)) {
            throw new Error("Not an array");
          }
        }
      } catch {
        if (lead.notes && lead.notes.trim().length > 0) {
          parsedNotes = [
            {
              text: lead.notes,
              createdAt: lead.createdAt.toISOString(),
              author: "Unknown",
            },
          ];
        }
      }

      const author = user.role === UserRole.MAIN_ADMIN ? "Admin" : "Warden";
      parsedNotes.push({
        text: note.trim(),
        createdAt: new Date().toISOString(),
        author,
      });

      updateData.notes = JSON.stringify(parsedNotes);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ lead });
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    return handleApiError(error);
  }
}
