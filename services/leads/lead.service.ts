import { prisma } from "@/lib/db";
import { normalizePhoneNumber } from "@/lib/whatsapp/utils";
import { LeadSource, LeadStatus } from "@prisma/client";
import { ValidationError, NotFoundError } from "@/lib/errors";

export async function getLeads(hostelId?: string | null) {
  if (hostelId) {
    return prisma.lead.findMany({
      where: { hostelId },
      orderBy: { createdAt: "desc" },
    });
  }
  return prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getLeadById(id: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    throw new NotFoundError("Lead not found");
  }
  return lead;
}

export interface CreateLeadInput {
  phone: string;
  source: LeadSource;
  notes?: string;
  hostelId?: string | null;
  author: string;
}

export async function createLead(input: CreateLeadInput) {
  if (!input.phone || typeof input.phone !== "string") {
    throw new ValidationError("Phone number is required");
  }
  if (!input.source || !Object.values(LeadSource).includes(input.source)) {
    throw new ValidationError(
      `Invalid lead source. Must be one of: ${Object.values(LeadSource).join(", ")}`
    );
  }

  const normalizedPhone = normalizePhoneNumber(input.phone);

  if (input.hostelId) {
    const hostel = await prisma.hostel.findUnique({
      where: { id: input.hostelId },
      select: { id: true },
    });
    if (!hostel) {
      throw new ValidationError("Hostel not found");
    }
  }

  let serializedNotes: string;
  if (input.notes && typeof input.notes === "string" && input.notes.trim().length > 0) {
    serializedNotes = JSON.stringify([
      {
        text: input.notes.trim(),
        createdAt: new Date().toISOString(),
        author: input.author,
      },
    ]);
  } else {
    serializedNotes = "[]";
  }

  return prisma.lead.create({
    data: {
      phone: normalizedPhone,
      source: input.source,
      notes: serializedNotes,
      hostelId: input.hostelId || null,
    },
  });
}

export interface UpdateLeadInput {
  status: LeadStatus;
  notes?: string;
  author: string;
}

export async function updateLead(id: string, input: UpdateLeadInput) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    throw new NotFoundError("Lead not found");
  }

  let existingNotes: any[] = [];
  if (lead.notes && lead.notes !== "[]") {
    try {
      existingNotes = JSON.parse(lead.notes);
      if (!Array.isArray(existingNotes)) {
        existingNotes = [];
      }
    } catch {
      existingNotes = [];
    }
  }

  if (input.notes && typeof input.notes === "string" && input.notes.trim().length > 0) {
    existingNotes.push({
      text: input.notes.trim(),
      createdAt: new Date().toISOString(),
      author: input.author,
    });
  }

  return prisma.lead.update({
    where: { id },
    data: {
      status: input.status,
      notes: JSON.stringify(existingNotes),
    },
  });
}
