import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole, AccommodationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createHostelWithWarden } from "@/services/hostel/hostel.service";

const createHostelSchema = z.object({
  name: z.string().min(1, "Hostel name is required"),
  address: z.string().min(1, "Address is required"),
  accommodationType: z.nativeEnum(AccommodationType),
  wardenEmail: z.string().email("Invalid email for warden"),
  wardenPhone: z
    .string()
    .regex(/^\+\d{1,3}\d{6,14}$/, "Phone must start with country code (e.g. +91)"),
  wardenPassword: z.string().min(8, "Password must be at least 8 characters"),
});

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
