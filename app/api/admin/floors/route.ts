import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { createFloor } from "@/services/hostel/structure.service";

const createFloorSchema = z.object({
  hostelId: z.string().uuid(),
  name: z.string().min(1, "Floor name is required"),
  sortOrder: z.number().int().min(0),
});

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireRole([UserRole.MAIN_ADMIN]);
    const body = await request.json();
    const data = createFloorSchema.parse(body);

    await requireHostelAccess({ user }, data.hostelId);

    const floor = await createFloor(data);
    return Response.json(floor, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
