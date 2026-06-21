import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole, BedStatus, BedType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { updateBed, deleteBed } from "@/services/hostel/structure.service";

const updateBedSchema = z.object({
  label: z.string().min(1).optional(),
  bedType: z.nativeEnum(BedType).nullable().optional(),
  status: z.nativeEnum(BedStatus).optional(),
});

async function getBedHostelId(bedId: string): Promise<string | null> {
  const bed = await prisma.bed.findUnique({
    where: { id: bedId },
    select: {
      room: {
        select: {
          floor: { select: { hostelId: true } },
          flat: { select: { floor: { select: { hostelId: true } } } },
        },
      },
    },
  });
  if (!bed) return null;
  return bed.room.floor?.hostelId ?? bed.room.flat?.floor.hostelId ?? null;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireRole([UserRole.MAIN_ADMIN]);
    const { id } = await params;

    const hostelId = await getBedHostelId(id);
    if (hostelId) await requireHostelAccess({ user }, hostelId);

    const body = await request.json();
    const data = updateBedSchema.parse(body);

    const result = await updateBed(id, data);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireRole([UserRole.MAIN_ADMIN]);
    const { id } = await params;

    const hostelId = await getBedHostelId(id);
    if (hostelId) await requireHostelAccess({ user }, hostelId);

    await deleteBed(id);
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
