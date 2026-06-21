import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);
    
    // Fetch tenant profile
    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
    });

    if (!tenant) {
      throw new NotFoundError("Tenant profile not found");
    }

    // Fetch the tenant's current stay
    const stay = await prisma.stay.findFirst({
      where: {
        tenantId: tenant.id,
      },
      include: {
        bed: {
          include: {
            room: true,
          },
        },
        payments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!stay) {
      return NextResponse.json({ stay: null });
    }

    // Fetch hostel details
    const hostel = await prisma.hostel.findUnique({
      where: { id: stay.hostelId },
    });

    return NextResponse.json({
      stay: {
        id: stay.id,
        status: stay.status,
        durationType: stay.durationType,
        joiningDate: stay.joiningDate,
        endDate: stay.endDate,
        admissionFee: stay.admissionFeePaise / 100,
        monthlyRent: stay.monthlyRentPaise / 100,
        securityDeposit: stay.securityDepositPaise / 100,
        foodCharges: stay.foodChargesPaise / 100,
        foodPlan: stay.foodPlan,
        totalPayable: stay.totalPayablePaise / 100,
        discount: stay.discountPaise / 100,
      },
      hostel: hostel ? {
        id: hostel.id,
        name: hostel.name,
        address: hostel.address,
      } : null,
      bed: {
        id: stay.bed.id,
        label: stay.bed.label,
        roomNumber: stay.bed.room.roomNumber,
        sharingType: stay.bed.room.sharingType,
      },
      payments: stay.payments.map((p) => ({
        id: p.id,
        amountPaid: p.amountPaidPaise / 100,
        paymentMode: p.paymentMode,
        transactionRefNo: p.transactionRefNo,
        paymentStatus: p.paymentStatus,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
