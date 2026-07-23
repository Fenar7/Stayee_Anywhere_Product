import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";
import { UserRole, StayStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const hostelId = await resolveHostelId(session, request);

    // Fetch stays and onboarding requests for warden's hostel
    const stays = await prisma.stay.findMany({
      where: {
        hostelId,
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
        tenant: {
          include: {
            user: true,
          },
        },
        bed: {
          include: {
            room: true,
          },
        },
        payments: {
          select: {
            paymentStatus: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Also get corresponding onboarding requests to map them
    const onboardingRequests = await prisma.onboardingRequest.findMany({
      where: {
        hostelId,
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
        totalPayable: stay.totalPayablePaise / 100, // paise to rupees
        hasPendingPayment: stay.payments.some((p) => p.paymentStatus === "PENDING"),
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
        },
        onboardingRequest: matchingReq
          ? {
              id: matchingReq.id,
              status: matchingReq.status,
              onboardingCurrentStep: matchingReq.onboardingCurrentStep,
              createdAt: matchingReq.createdAt,
            }
          : null,
      };
    });

    return NextResponse.json({ onboards: mapped });
  } catch (error) {
    return handleApiError(error);
  }
}
