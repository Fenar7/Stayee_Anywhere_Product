import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError, ValidationError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { getAvailableBeds } from "@/services/beds/bed.service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
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

    const availableBeds = await getAvailableBeds(hostelId, start, end);

    const beds = availableBeds.map(bed => ({
      id: bed.id,
      label: bed.label,
      roomNumber: bed.room.roomNumber,
      sharingType: bed.room.sharingType,
      flatName: bed.room.flat?.name || null,
      floorName: bed.room.floor?.name || bed.room.flat?.floor.name || "Unknown Floor",
    }));

    return NextResponse.json({ availableBeds: beds });
  } catch (error) {
    return handleApiError(error);
  }
}