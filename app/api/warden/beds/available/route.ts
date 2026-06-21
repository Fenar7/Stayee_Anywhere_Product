import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN]);

    const { searchParams } = new URL(request.url);
    const joiningDate = searchParams.get("joiningDate");
    const endDate = searchParams.get("endDate");

    if (!joiningDate || !endDate) {
      throw new Error("joiningDate and endDate are required");
    }

    const warden = session.user.warden!;
    const hostelId = warden.hostelId;

    const start = new Date(joiningDate);
    const end = new Date(endDate);

    const occupiedBedIds = await prisma.stay.findMany({
      where: {
        hostelId,
        status: { in: ["ACTIVE", "EXTENDED"] },
        OR: [
          {
            joiningDate: {
              lte: new Date(end.getTime() + 86400000),
            },
            endDate: {
              gte: new Date(start.getTime()),
            },
          },
        ],
      },
      select: { bedId: true },
    });

    const occupiedBedIdList = occupiedBedIds.map((stay) => stay.bedId);

    const availableBeds = await prisma.bed.findMany({
      where: {
        roomId: {
          in: await prisma.room.findMany({
            where: {
              OR: [
                {
                  flat: {
                    floor: {
                      hostelId,
                    },
                  },
                },
                {
                  floor: {
                    hostelId,
                  },
                },
              ],
            },
            select: { id: true },
          }),
        },
        status: "AVAILABLE",
        id: {
          notIn: occupiedBedIdList,
        },
      },
      include: {
        room: {
          include: {
            flat: {
              include: { floor: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      availableBeds: availableBeds.map((bed) => ({
        id: bed.id,
        label: bed.label,
        roomNumber: bed.room.roomNumber,
        sharingType: bed.room.sharingType,
        floorName: bed.room.flat.floor.name,
        flatName: bed.room.flat.name,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}