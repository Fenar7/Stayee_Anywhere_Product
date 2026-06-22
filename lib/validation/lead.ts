import { z } from "zod";
import { LeadStatus } from "@prisma/client";

export const createLeadSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^\+?[0-9\s\-]{10,15}$/, "Invalid phone format"),
  hostelId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export const updateLeadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
  notes: z.string().max(500).optional(),
});
