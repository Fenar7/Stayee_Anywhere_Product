import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createFlat } from "@/services/hostel/structure.service";

const createFlatSchema = z.object({
  floorId: z.string().uuid(),
  name: z.string().min(1, "Flat name is required"),
  isPrivate: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireRole([UserRole.MAIN_ADMIN]);
    const body = await request.json();
    const data = createFlatSchema.parse(body);

    const floor = await prisma.floor.findUnique({ where: { id: data.floorId }, select: { hostelId: true } });
    if (floor) await requireHostelAccess({ user }, floor.hostelId);

    const flat = await createFlat(data);
    return Response.json(flat, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
