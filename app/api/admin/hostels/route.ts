import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole, AccommodationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createHostelWithWarden } from "@/services/hostel/hostel.service";
import { createHostelSchema } from "@/lib/validation/hostel";



export async function POST(request: NextRequest) {
  try {
    await requireRole([UserRole.MAIN_ADMIN]);

    const body = await request.json();
    const data = createHostelSchema.parse(body);

    const result = await createHostelWithWarden(data);

    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    await requireRole([UserRole.MAIN_ADMIN]);
    const hostels = await prisma.hostel.findMany({
      orderBy: { name: "asc" },
      include: {
        location: true,
        warden: {
          include: {
            user: {
              select: { id: true, email: true, phone: true },
            },
          },
        },
        _count: { select: { floors: true } },
      },
    });
    return Response.json(hostels);
  } catch (error) {
    return handleApiError(error);
  }
}
