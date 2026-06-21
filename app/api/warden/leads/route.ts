import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, ValidationError, ForbiddenError } from "@/lib/errors";
import { normalizePhoneNumber } from "@/lib/whatsapp/utils";
import { UserRole, LeadSource } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const { user } = session;

    const { searchParams } = new URL(request.url);
    const isAdmin = user.role === UserRole.MAIN_ADMIN;

    if (isAdmin) {
      const hostelIdParam = searchParams.get("hostelId");
      if (hostelIdParam) {
        const leads = await prisma.lead.findMany({
          where: { hostelId: hostelIdParam },
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ leads });
      }

      const leads = await prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ leads });
    }

    const hostelId = await resolveHostelId(session, request);
    const leads = await prisma.lead.findMany({
      where: { hostelId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ leads });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const { user } = session;

    const body = await request.json();
    const { phone, source, notes, hostelId: bodyHostelId } = body;

    if (!phone || typeof phone !== "string") {
      throw new ValidationError("Phone number is required");
    }
    if (!source || !Object.values(LeadSource).includes(source)) {
      throw new ValidationError(
        `Invalid lead source. Must be one of: ${Object.values(LeadSource).join(", ")}`
      );
    }

    const normalizedPhone = normalizePhoneNumber(phone);

    let resolvedHostelId: string | null = null;
    if (user.role === UserRole.MAIN_ADMIN) {
      resolvedHostelId = bodyHostelId ?? null;
      if (resolvedHostelId) {
        const hostel = await prisma.hostel.findUnique({
          where: { id: resolvedHostelId },
          select: { id: true },
        });
        if (!hostel) {
          throw new ValidationError("Hostel not found");
        }
      }
    } else {
      resolvedHostelId = await resolveHostelId(session, request);
    }

    const author = user.role === UserRole.MAIN_ADMIN ? "Admin" : "Warden";

    let serializedNotes: string;
    if (notes && typeof notes === "string" && notes.trim().length > 0) {
      serializedNotes = JSON.stringify([
        {
          text: notes.trim(),
          createdAt: new Date().toISOString(),
          author,
        },
      ]);
    } else {
      serializedNotes = "[]";
    }

    const lead = await prisma.lead.create({
      data: {
        phone: normalizedPhone,
        source,
        notes: serializedNotes,
        hostelId: resolvedHostelId,
      },
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
