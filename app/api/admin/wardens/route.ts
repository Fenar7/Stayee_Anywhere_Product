import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);

    const { searchParams } = new URL(request.url);
    const hostelId = searchParams.get("hostelId");

    const where = hostelId 
      ? { hostelId, user: { organizationId: session.user.organizationId } } 
      : { user: { organizationId: session.user.organizationId } };

    const wardens = await prisma.warden.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        hostel: {
          select: {
            id: true,
            name: true,
            accommodationType: true,
            location: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: { onboardingRequests: true },
        },
      },
      orderBy: { hostel: { name: "asc" } },
    });

    return NextResponse.json({
      wardens: wardens.map((w) => ({
        id: w.id,
        userId: w.user.id,
        phone: w.user.phone,
        email: w.user.email,
        hostel: {
          id: w.hostel.id,
          name: w.hostel.name,
          accommodationType: w.hostel.accommodationType,
          location: w.hostel.location,
        },
        totalOnboardings: w._count.onboardingRequests,
        createdAt: w.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
