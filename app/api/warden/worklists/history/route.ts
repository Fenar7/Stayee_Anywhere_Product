import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";
import { UserRole, PaymentStatus, PaymentMode, Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN, UserRole.WARDEN]);
    const hostelId = await resolveHostelId(session, request);

    if (!hostelId) {
      return NextResponse.json({ error: "Hostel ID is required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const paymentMode = searchParams.get("paymentMode")?.trim() || "";
    const statusFilter = searchParams.get("status")?.trim() || "";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "15", 10) || 15));
    const skip = (page - 1) * limit;

    // Base WHERE condition: scoped to hostel
    const where: Prisma.PaymentWhereInput = {
      stay: {
        hostelId,
      },
    };

    // Filter by Payment Status (default to PAID if not specified or 'ALL')
    if (statusFilter && statusFilter !== "ALL") {
      if (Object.values(PaymentStatus).includes(statusFilter as PaymentStatus)) {
        where.paymentStatus = statusFilter as PaymentStatus;
      }
    } else if (!statusFilter) {
      where.paymentStatus = PaymentStatus.PAID;
    }

    // Filter by Payment Mode
    if (paymentMode && paymentMode !== "ALL") {
      if (Object.values(PaymentMode).includes(paymentMode as PaymentMode)) {
        where.paymentMode = paymentMode as PaymentMode;
      }
    }

    // Filter by Date Range
    if (startDateParam || endDateParam) {
      where.createdAt = {};
      if (startDateParam) {
        const start = new Date(startDateParam);
        if (!isNaN(start.getTime())) {
          where.createdAt.gte = start;
        }
      }
      if (endDateParam) {
        const end = new Date(endDateParam);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }
    }

    // Filter by Search Term across Tenant Name, Room #, Bed Label, Txn Ref, Receipt #
    if (search) {
      const isNumeric = !isNaN(Number(search));
      const searchConditions: Prisma.PaymentWhereInput[] = [
        {
          stay: {
            tenant: {
              fullName: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          stay: {
            bed: {
              room: { roomNumber: { contains: search, mode: "insensitive" } },
            },
          },
        },
        {
          stay: {
            bed: { label: { contains: search, mode: "insensitive" } },
          },
        },
        {
          transactionRefNo: { contains: search, mode: "insensitive" },
        },
      ];

      if (isNumeric) {
        searchConditions.push({ receiptNumber: Number(search) });
      }

      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { OR: searchConditions },
      ];
    }

    // Execute queries in parallel for high performance
    const [totalCount, aggregate, modeCounts, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.aggregate({
        where,
        _sum: {
          amountPaidPaise: true,
        },
      }),
      prisma.payment.groupBy({
        by: ["paymentMode"],
        where: { stay: { hostelId }, paymentStatus: PaymentStatus.PAID },
        _count: true,
      }),
      prisma.payment.findMany({
        where,
        include: {
          stay: {
            include: {
              tenant: {
                select: {
                  id: true,
                  fullName: true,
                  emergencyContactNumber: true,
                  user: { select: { email: true, phone: true } },
                },
              },
              bed: {
                include: {
                  room: { select: { roomNumber: true, floor: { select: { name: true } } } },
                },
              },
            },
          },
          verifiedByUser: {
            select: {
              id: true,
              email: true,
              phone: true,
              role: true,
            },
          },
          screenshotDocument: {
            select: {
              id: true,
              storagePath: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const totalPaidPaise = aggregate._sum.amountPaidPaise || 0;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // Calculate Payment Mode Counts for Metrics Ribbon
    let upiCount = 0;
    let cashCount = 0;
    let otherCount = 0;
    modeCounts.forEach((m) => {
      if (m.paymentMode === PaymentMode.UPI) upiCount += m._count;
      else if (m.paymentMode === PaymentMode.CASH) cashCount += m._count;
      else otherCount += m._count;
    });

    // Enriched Payment Objects
    const enrichedPayments = payments.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      amountPaidPaise: p.amountPaidPaise,
      amount: p.amountPaidPaise / 100,
      paymentMode: p.paymentMode,
      transactionRefNo: p.transactionRefNo,
      paymentStatus: p.paymentStatus,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
      verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
      verifiedByUser: p.verifiedByUser
        ? {
            id: p.verifiedByUser.id,
            fullName: p.verifiedByUser.email ? p.verifiedByUser.email.split("@")[0] : p.verifiedByUser.role === "WARDEN" ? "Warden" : "Admin",
            email: p.verifiedByUser.email || "",
            role: p.verifiedByUser.role,
          }
        : null,
      tenant: {
        id: p.stay.tenant.id,
        fullName: p.stay.tenant.fullName,
        phone: p.stay.tenant.user?.phone || null,
        email: p.stay.tenant.user?.email || null,
        emergencyContactPhone: p.stay.tenant.emergencyContactNumber,
      },
      bed: {
        id: p.stay.bed.id,
        label: p.stay.bed.label,
        roomNumber: p.stay.bed.room.roomNumber,
        floorName: p.stay.bed.room.floor?.name || "Ground Floor",
      },
      stay: {
        id: p.stay.id,
        status: p.stay.status,
        joiningDate: p.stay.joiningDate.toISOString(),
        endDate: p.stay.endDate ? p.stay.endDate.toISOString() : null,
        monthlyRentPaise: p.stay.monthlyRentPaise,
        monthlyRent: p.stay.monthlyRentPaise / 100,
      },
      screenshotDocumentId: p.screenshotDocumentId,
    }));

    return NextResponse.json({
      payments: enrichedPayments,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      },
      metrics: {
        totalPaidPaise,
        totalPaidAmount: totalPaidPaise / 100,
        upiCount,
        cashCount,
        otherCount,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
