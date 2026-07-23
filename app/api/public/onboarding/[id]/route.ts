import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import { OnboardingRequestStatus } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const request_ = await prisma.onboardingRequest.findUnique({
      where: { id },
      include: {
        hostel: { select: { id: true, name: true } },
        bed: { include: { room: true } },
      },
    });

    if (!request_) {
      throw new NotFoundError("Onboarding request not found");
    }

    const isBlocked =
      request_.status !== OnboardingRequestStatus.PENDING ||
      request_.tempPasswordHash === null;

    const formatPlusPhone = (p: string) => {
      const digits = p.replace(/\D/g, "");
      if (!digits) return p;
      if (digits.length === 10) return `+91${digits}`;
      return `+${digits}`;
    };

    return NextResponse.json({
      id: request_.id,
      phone: formatPlusPhone(request_.phone),
      hostelName: request_.hostel.name,
      bedLabel: `${request_.bed.room.roomNumber} - ${request_.bed.label}`,
      isBlocked,
      hasTempPassword: request_.tempPasswordHash !== null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
