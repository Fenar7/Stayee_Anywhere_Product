import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";
import { UserRole, StayStatus, PaymentStatus } from "@prisma/client";
import { getStartOfDayIST, addDays, diffInDays } from "@/lib/dates";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const hostelId = await resolveHostelId(session, request);

    const todayStart = getStartOfDayIST(new Date());
    const endOf14Days = addDays(todayStart, 14);
    endOf14Days.setHours(23, 59, 59, 999);

    const [rentDueStays, paymentsPending, applicationsPending, serviceRequestsPending] = await Promise.all([
      // 1. Active/Extended stays with checkout within 14 days
      prisma.stay.findMany({
        where: {
          hostelId,
          status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
          endDate: {
            gte: todayStart,
            lte: endOf14Days,
          },
        },
        include: {
          tenant: {
            include: {
              user: { select: { email: true, phone: true } },
            },
          },
          bed: {
            include: {
              room: true,
            },
          },
        },
        orderBy: { endDate: "asc" },
      }),

      // 2. Stays awaiting payment with a PENDING payment record
      prisma.stay.findMany({
        where: {
          hostelId,
          status: StayStatus.APPROVED_AWAITING_PAYMENT,
          payments: {
            some: {
              paymentStatus: PaymentStatus.PENDING,
            },
          },
        },
        include: {
          tenant: {
            include: {
              user: { select: { email: true, phone: true } },
            },
          },
          bed: {
            include: {
              room: true,
            },
          },
          payments: {
            where: { paymentStatus: PaymentStatus.PENDING },
            select: {
              id: true,
              amountPaidPaise: true,
              transactionRefNo: true,
              paymentStatus: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),

      // 3. Onboarding pending with completed registration
      prisma.stay.findMany({
        where: {
          hostelId,
          status: StayStatus.ONBOARDING_PENDING,
          tenant: {
            userId: { not: null },
          },
        },
        include: {
          tenant: {
            include: {
              user: { select: { email: true, phone: true } },
            },
          },
          bed: {
            include: {
              room: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),

      // 4. Service requests with uploaded payment screenshots
      prisma.serviceRequest.findMany({
        where: {
          status: "PAYMENT_UPLOADED",
          stay: {
            hostelId,
          },
        },
        include: {
          stay: {
            include: {
              tenant: {
                select: { fullName: true, id: true },
              },
              bed: {
                include: { room: true },
              },
            },
          },
          payment: {
            include: {
              screenshotDocument: true,
            },
          },
        },
        orderBy: { updatedAt: "asc" },
      }),
    ]);

    // Enrich rent due stays with days remaining and rent amount
    const enrichedRentDue = rentDueStays.map((stay) => {
      const daysRemaining = diffInDays(todayStart, stay.endDate);
      return {
        id: stay.id,
        status: stay.status,
        joiningDate: stay.joiningDate,
        endDate: stay.endDate,
        daysRemaining,
        rentAmount: stay.monthlyRentPaise / 100,
        tenant: {
          id: stay.tenant.id,
          fullName: stay.tenant.fullName,
          email: stay.tenant.user?.email ?? null,
          phone: stay.tenant.user?.phone ?? null,
        },
        bed: {
          id: stay.bed.id,
          label: stay.bed.label,
          roomNumber: stay.bed.room.roomNumber,
        },
      };
    });

    // Enrich payments pending
    const enrichedPayments = paymentsPending.map((stay) => ({
      id: stay.id,
      status: stay.status,
      totalPayable: stay.totalPayablePaise / 100,
      tenant: {
        id: stay.tenant.id,
        fullName: stay.tenant.fullName,
        email: stay.tenant.user?.email ?? null,
        phone: stay.tenant.user?.phone ?? null,
      },
      bed: {
        id: stay.bed.id,
        label: stay.bed.label,
        roomNumber: stay.bed.room.roomNumber,
      },
      pendingPayments: stay.payments.map((p) => ({
        id: p.id,
        amountPaise: p.amountPaidPaise,
        amount: p.amountPaidPaise / 100,
        transactionRefNo: p.transactionRefNo,
        paymentStatus: p.paymentStatus,
      })),
    }));

    // Enrich applications pending
    const enrichedApplications = applicationsPending.map((stay) => ({
      id: stay.id,
      status: stay.status,
      joiningDate: stay.joiningDate,
      endDate: stay.endDate,
      tenant: {
        id: stay.tenant.id,
        fullName: stay.tenant.fullName,
        email: stay.tenant.user?.email ?? null,
        phone: stay.tenant.user?.phone ?? null,
      },
      bed: {
        id: stay.bed.id,
        label: stay.bed.label,
        roomNumber: stay.bed.room.roomNumber,
      },
    }));

    const enrichedServiceRequests = serviceRequestsPending.map((sr) => ({
      id: sr.id,
      type: sr.type,
      amount: sr.amountPaise / 100,
      metadata: sr.metadata,
      stay: {
        id: sr.stay.id,
        tenantName: sr.stay.tenant.fullName,
        bedLabel: sr.stay.bed.label,
        roomNumber: sr.stay.bed.room.roomNumber,
      },
      payment: sr.payment ? {
        id: sr.payment.id,
        screenshotDocumentId: sr.payment.screenshotDocumentId,
      } : null,
    }));

    return NextResponse.json({
      rentDueStays: enrichedRentDue,
      paymentsPending: enrichedPayments,
      applicationsPending: enrichedApplications,
      serviceRequestsPending: enrichedServiceRequests,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
