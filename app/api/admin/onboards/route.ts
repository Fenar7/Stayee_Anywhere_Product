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

    const onboardingRequests = await prisma.onboardingRequest.findMany({
      where: {
        hostel: { organizationId: session.user.organizationId },
      },
    });

    const mapped = stays.map((stay) => {
      const isPhoneMatch = (reqPhone?: string | null, targetPhone?: string | null) => {
        if (!reqPhone || !targetPhone) return false;
        const cleanReq = reqPhone.replace(/\D/g, "");
        const cleanTarget = targetPhone.replace(/\D/g, "");
        if (!cleanReq || !cleanTarget) return false;
        return cleanReq.endsWith(cleanTarget) || cleanTarget.endsWith(cleanReq);
      };

      const matchingReq = onboardingRequests.find(
        (r) =>
          r.bedId === stay.bedId ||
          isPhoneMatch(r.phone, stay.tenant.emergencyContactNumber) ||
          isPhoneMatch(r.phone, stay.tenant.user?.phone)
      );

      const rawPhone = stay.tenant.user?.phone || "";
      const isUuid = rawPhone.includes("-") || rawPhone.length > 20;
      const displayPhone = !isUuid && rawPhone ? rawPhone : (stay.tenant.emergencyContactNumber || matchingReq?.phone || "");

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
          phone: displayPhone,
          gender: stay.tenant.gender,
          hasProfile: stay.tenant.userId !== null && !stay.tenant.fullName.startsWith("Prospect "),
          plainTextPassword: stay.tenant.user?.plainTextPassword || null,
        },
        bed: {
          id: stay.bed.id,
          label: stay.bed.label,
          roomNumber: stay.bed.room.roomNumber,
          status: stay.bed.status,
        },
        onboardingRequest: matchingReq
          ? { id: matchingReq.id, status: matchingReq.status, onboardingCurrentStep: matchingReq.onboardingCurrentStep, createdAt: matchingReq.createdAt }
          : null,
      };
    });

    return NextResponse.json({ onboards: mapped });
  } catch (error) {
    return handleApiError(error);
  }
}
