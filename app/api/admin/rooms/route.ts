import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole, SharingType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createRoom } from "@/services/hostel/structure.service";

const createRoomSchema = z.object({
  flatId: z.string().uuid().optional().nullable(),
  floorId: z.string().uuid().optional().nullable(),
  roomNumber: z.string().min(1, "Room number is required"),
  sharingType: z.nativeEnum(SharingType),
  isPrivate: z.boolean().optional().default(false),
}).refine(
  (data) => (!!data.flatId) !== (!!data.floorId),
  { message: "Exactly one of flatId or floorId must be provided" }
);

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireRole([UserRole.MAIN_ADMIN]);
    const body = await request.json();
    const data = createRoomSchema.parse(body);

    if (data.flatId) {
      const flat = await prisma.flat.findUnique({
        where: { id: data.flatId },
        select: { floor: { select: { hostelId: true } } },
      });
      if (flat) await requireHostelAccess({ user }, flat.floor.hostelId);
    }

    if (data.floorId) {
      const floor = await prisma.floor.findUnique({
        where: { id: data.floorId },
        select: { hostelId: true },
      });
      if (floor) await requireHostelAccess({ user }, floor.hostelId);
    }

    const room = await createRoom(data);
    return Response.json(room, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
