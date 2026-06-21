import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole, SharingType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { updateRoom, deleteRoom } from "@/services/hostel/structure.service";

const updateRoomSchema = z.object({
  roomNumber: z.string().min(1).optional(),
  sharingType: z.nativeEnum(SharingType).optional(),
  isPrivate: z.boolean().optional(),
  flatId: z.string().uuid().nullable().optional(),
  floorId: z.string().uuid().nullable().optional(),
});

async function getRoomHostelId(roomId: string): Promise<string | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      floor: { select: { hostelId: true } },
      flat: { select: { floor: { select: { hostelId: true } } } },
    },
  });
  if (!room) return null;
  return room.floor?.hostelId ?? room.flat?.floor.hostelId ?? null;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireRole([UserRole.MAIN_ADMIN]);
    const { id } = await params;

    const hostelId = await getRoomHostelId(id);
    if (hostelId) await requireHostelAccess({ user }, hostelId);

    const body = await request.json();
    const data = updateRoomSchema.parse(body);

    const result = await updateRoom(id, data);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireRole([UserRole.MAIN_ADMIN]);
    const { id } = await params;

    const hostelId = await getRoomHostelId(id);
    if (hostelId) await requireHostelAccess({ user }, hostelId);

    await deleteRoom(id);
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
