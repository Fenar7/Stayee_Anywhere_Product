import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole, AccommodationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createHostelWithWarden } from "@/services/hostel/hostel.service";
import { createHostelSchema } from "@/lib/validation/hostel";



export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);

    const body = await request.json();
    const data = createHostelSchema.parse(body);

    const result = await createHostelWithWarden({
      ...data,
      organizationId: session.user.organizationId,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");

    const hostels = await prisma.hostel.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(locationId ? { locationId } : {}),
      },
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
