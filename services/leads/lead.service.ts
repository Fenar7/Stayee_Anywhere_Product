import { prisma } from "@/lib/db";
import { normalizePhoneNumber } from "@/lib/whatsapp/utils";
import { LeadSource, LeadStatus } from "@prisma/client";
import { ValidationError, NotFoundError } from "@/lib/errors";

export async function getLeads(organizationId: string, hostelId?: string | null) {
  if (hostelId) {
    return prisma.lead.findMany({
      where: { hostelId, organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        notes: {
          include: { author: { select: { id: true, phone: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }
  return prisma.lead.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      notes: {
        include: { author: { select: { id: true, phone: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getLeadById(organizationId: string, id: string) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      notes: {
        include: { author: { select: { id: true, phone: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!lead || lead.organizationId !== organizationId) {
    throw new NotFoundError("Lead not found or access denied");
  }
  return lead;
}

export interface CreateLeadInput {
  phone: string;
  source: LeadSource;
  notes?: string;
  hostelId?: string | null;
  authorId: string;
  organizationId: string;
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

  return prisma.lead.create({
    data: {
      phone: normalizedPhone,
      source: input.source,
      hostelId: input.hostelId || null,
      organizationId: input.organizationId,
      ...(input.notes && input.notes.trim().length > 0
        ? {
            notes: {
              create: {
                note: input.notes.trim(),
                authorId: input.authorId,
              },
            },
          }
        : {}),
    },
    include: {
      notes: {
        include: { author: { select: { id: true, phone: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export interface UpdateLeadInput {
  status: LeadStatus;
  notes?: string;
  authorId: string;
}

export async function updateLead(id: string, input: UpdateLeadInput) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    throw new NotFoundError("Lead not found");
  }

  return prisma.lead.update({
    where: { id },
    data: {
      status: input.status,
      ...(input.notes && input.notes.trim().length > 0
        ? {
            notes: {
              create: {
                note: input.notes.trim(),
                authorId: input.authorId,
              },
            },
          }
        : {}),
    },
    include: {
      notes: {
        include: { author: { select: { id: true, phone: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
