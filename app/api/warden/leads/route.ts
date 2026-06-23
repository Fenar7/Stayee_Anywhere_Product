import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError, ValidationError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { getLeads, createLead } from "@/services/leads/lead.service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { user } = session;

    const { searchParams } = new URL(request.url);
    const isAdmin = user.role === UserRole.MAIN_ADMIN;

    if (isAdmin) {
      const hostelIdParam = searchParams.get("hostelId");
      if (hostelIdParam) {
        const leads = await getLeads(hostelIdParam);
        return NextResponse.json({ leads });
      }

      const leads = await getLeads();
      return NextResponse.json({ leads });
    }

    const hostelId = await resolveHostelId(session, request);
    const leads = await getLeads(hostelId);
    return NextResponse.json({ leads });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { user } = session;

    const body = await request.json();
    const { phone, source, notes, hostelId: bodyHostelId } = body;

    let resolvedHostelId: string | null = null;
    if (user.role === UserRole.MAIN_ADMIN) {
      resolvedHostelId = bodyHostelId ?? null;
    } else {
      resolvedHostelId = await resolveHostelId(session, request);
    }

    const author = user.role === UserRole.MAIN_ADMIN ? "Admin" : "Warden";

    const lead = await createLead({
      phone,
      source,
      notes,
      hostelId: resolvedHostelId,
      author,
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
