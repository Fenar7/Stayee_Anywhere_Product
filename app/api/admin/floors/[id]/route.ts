import { NextRequest } from "next/server";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { updateFloor, deleteFloor } from "@/services/hostel/structure.service";
import { updateFloorSchema } from "@/lib/validation/hostel";



export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireRole([UserRole.MAIN_ADMIN]);
    const { id } = await params;

    const floor = await prisma.floor.findUnique({ where: { id }, select: { hostelId: true } });
    if (floor) await requireHostelAccess({ user }, floor.hostelId);

    const body = await request.json();
    const data = updateFloorSchema.parse(body);

    const result = await updateFloor(id, data);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireRole([UserRole.MAIN_ADMIN]);
    const { id } = await params;

    const floor = await prisma.floor.findUnique({ where: { id }, select: { hostelId: true } });
    if (floor) await requireHostelAccess({ user }, floor.hostelId);

    await deleteFloor(id);
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
