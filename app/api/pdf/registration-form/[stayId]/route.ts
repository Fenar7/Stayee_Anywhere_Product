import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { generateRegistrationForm } from "@/services/pdf/registration-form.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stayId: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { stayId } = await params;

    // Fetch stay with hostel for authorization
    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
      select: { hostelId: true },
    });

    if (!stay) {
      throw new NotFoundError("Stay record not found");
    }

    // Authorization: WARDEN must manage this hostel
    if (session.user.role === UserRole.WARDEN) {
      if (!session.user.warden || session.user.warden.hostelId !== stay.hostelId) {
        throw new ForbiddenError("You are not authorized to generate forms for this stay");
      }
    }
    // MAIN_ADMIN bypasses

    const result = await generateRegistrationForm(stayId, session.user.id);

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      storagePath: result.storagePath,
      message: "Registration form generated successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
