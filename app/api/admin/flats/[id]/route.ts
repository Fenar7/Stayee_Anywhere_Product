import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { updateFlat, deleteFlat } from "@/services/hostel/structure.service";

const updateFlatSchema = z.object({
  name: z.string().min(1).optional(),
  isPrivate: z.boolean().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireRole([UserRole.MAIN_ADMIN]);
    const { id } = await params;

    const flat = await prisma.flat.findUnique({
      where: { id },
      select: { floor: { select: { hostelId: true } } },
    });
    if (flat) await requireHostelAccess({ user }, flat.floor.hostelId);

    const body = await request.json();
    const data = updateFlatSchema.parse(body);

    const result = await updateFlat(id, data);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireRole([UserRole.MAIN_ADMIN]);
    const { id } = await params;

    const flat = await prisma.flat.findUnique({
      where: { id },
      select: { floor: { select: { hostelId: true } } },
    });
    if (flat) await requireHostelAccess({ user }, flat.floor.hostelId);

    await deleteFlat(id);
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
