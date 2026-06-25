import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";
import { UserRole, StayStatus, BedStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);

    const stays = await prisma.stay.findMany({
      where: {
        hostel: { organizationId: session.user.organizationId },
        status: {
          in: [
            StayStatus.ONBOARDING_PENDING,
            StayStatus.APPROVED_AWAITING_PAYMENT,
            StayStatus.ACTIVE,
            StayStatus.EXTENDED,
          ],
        },
      },
      include: {
        hostel: { select: { id: true, name: true } },
        tenant: { include: { user: true } },
        bed: { include: { room: true } },
        payments: {
          select: {
            paymentStatus: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const onboardingRequests = await prisma.onboardingRequest.findMany();

    const mapped = stays.map((stay) => {
      const matchingReq = onboardingRequests.find(
        (r) => r.phone === stay.tenant.emergencyContactNumber || r.phone === stay.tenant.user?.phone
      );

      return {
        id: stay.id,
        status: stay.status,
        joiningDate: stay.joiningDate,
        endDate: stay.endDate,
        totalPayable: stay.totalPayablePaise / 100,
        hasPendingPayment: stay.payments.some((p) => p.paymentStatus === "PENDING"),
        hostel: stay.hostel,
        tenant: {
          id: stay.tenant.id,
          fullName: stay.tenant.fullName,
          phone: stay.tenant.user?.phone || matchingReq?.phone || "",
          gender: stay.tenant.gender,
          hasProfile: stay.tenant.userId !== null,
          plainTextPassword: stay.tenant.user?.plainTextPassword || null,
        },
        bed: {
          id: stay.bed.id,
          label: stay.bed.label,
          roomNumber: stay.bed.room.roomNumber,
          status: stay.bed.status,
        },
        onboardingRequest: matchingReq
          ? { id: matchingReq.id, status: matchingReq.status, createdAt: matchingReq.createdAt }
          : null,
      };
    });

    return NextResponse.json({ onboards: mapped });
  } catch (error) {
    return handleApiError(error);
  }
}
