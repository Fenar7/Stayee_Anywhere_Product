import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createLocationSchema } from "@/lib/validation/hostel";



export async function GET() {
  try {
    await requireRole([UserRole.MAIN_ADMIN]);
    const locations = await prisma.location.findMany({
      orderBy: { name: "asc" },
    });
    return Response.json(locations);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole([UserRole.MAIN_ADMIN]);

    const body = await request.json();
    const { name } = createLocationSchema.parse(body);

    const normalizedName = name.trim();

    // Check for duplicate
    const existing = await prisma.location.findUnique({
      where: { name: normalizedName },
    });

    if (existing) {
      return Response.json(existing, { status: 200 }); // return existing to avoid collision errors
    }

    const location = await prisma.location.create({
      data: { name: normalizedName },
    });

    return Response.json(location, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
