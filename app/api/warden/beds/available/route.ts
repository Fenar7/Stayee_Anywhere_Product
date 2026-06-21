import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, ValidationError } from "@/lib/errors";
import { UserRole, StayStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const hostelId = await resolveHostelId(session, request);

    const { searchParams } = new URL(request.url);
    const joiningDateParam = searchParams.get("joiningDate");
    const endDateParam = searchParams.get("endDate");

    if (!joiningDateParam || !endDateParam) {
      throw new ValidationError(
        "joiningDate and endDate query parameters are required"
      );
    }

    const start = new Date(joiningDateParam);
    const end = new Date(endDateParam);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError(
        "joiningDate and endDate must be valid ISO date strings"
      );
    }

    if (end <= start) {
      throw new ValidationError("endDate must be after joiningDate");
    }

    // Step 1: collect all bed IDs with ACTIVE or EXTENDED stays overlapping the range
    const occupiedStays = await prisma.stay.findMany({
      where: {
        hostelId,
        status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
        joiningDate: { lte: end },
        endDate: { gte: start },
      },
      select: { bedId: true },
    });

    const occupiedBedIdSet = new Set(occupiedStays.map((s) => s.bedId));

    // Step 2: fetch AVAILABLE beds using a nested relation filter — no double query round-trip.
    // Rooms belong EITHER to a flat (flat -> floor) OR directly to a floor.
    const availableBeds = await prisma.bed.findMany({
      where: {
        status: "AVAILABLE",
        id: { notIn: Array.from(occupiedBedIdSet) },
        room: {
          OR: [
            { flat: { floor: { hostelId } } },
            { floor: { hostelId } },
          ],
        },
      },
      include: {
        room: {
          include: {
            flat: { include: { floor: true } },
            floor: true, // direct floor link
          },
        },
      },
    });

    return NextResponse.json({
      availableBeds: availableBeds.map((bed) => {
        // Safe resolution — room may not have a flat
        const floorName =
          bed.room.flat?.floor.name ?? bed.room.floor?.name ?? "";
        const flatName = bed.room.flat?.name ?? null;

        return {
          id: bed.id,
          label: bed.label,
          bedType: bed.bedType,
          roomNumber: bed.room.roomNumber,
          sharingType: bed.room.sharingType,
          floorName,
          flatName,
        };
      }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}