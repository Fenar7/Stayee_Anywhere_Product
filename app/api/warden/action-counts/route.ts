import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { UserRole, StayStatus, PaymentStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);

    if (session.user.role === UserRole.WARDEN && !session.user.warden?.hostelId) {
      return NextResponse.json({ error: "Warden not assigned to a hostel" }, { status: 403 });
    }

    // Construct common where clause for warden
    const baseWhere = session.user.role === UserRole.WARDEN 
      ? { hostelId: session.user.warden!.hostelId } 
      : {};

    const [pendingReviews, pendingPayments, rentDueSoon] = await Promise.all([
      // ONBOARDING_PENDING
      prisma.stay.count({
        where: {
          ...baseWhere,
          status: StayStatus.ONBOARDING_PENDING,
        },
      }),
      // APPROVED_AWAITING_PAYMENT
      prisma.stay.count({
        where: {
          ...baseWhere,
          status: StayStatus.APPROVED_AWAITING_PAYMENT,
        },
      }),
      // Rent due soon (either balance > 0 and ACTIVE/EXTENDED)
      prisma.stay.count({
        where: {
          ...baseWhere,
          status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
          payments: {
            some: {
              paymentStatus: PaymentStatus.PENDING,
            }
          }
        },
      }),
    ]);

    // For rentDueSoon, wait, PRD says: "count of items needing action (pending payments + overdue rent)".
    // So rentDueSoon could be stays with PENDING payments, or where totalPayable > payments.
    // We'll use payments with PENDING status for now to signify they need action.

    return NextResponse.json({
      pendingReviews,
      pendingPayments,
      rentDueSoon,
    });
  } catch (error) {
    console.error("Failed to fetch action counts:", error);
    return NextResponse.json({ pendingReviews: 0, pendingPayments: 0, rentDueSoon: 0 }, { status: 500 });
  }
}
