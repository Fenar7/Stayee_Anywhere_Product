import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { rupeesToPaise, paiseToRupees } from "@/lib/money";
import { UserRole, PaymentMode, PaymentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { differenceInCalendarDays } from "date-fns";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { id: stayId } = await params;

    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
    });

    if (!stay) {
      throw new NotFoundError("Stay record not found");
    }

    const hostelId = await resolveHostelId(session, request, stay.hostelId);

    if (session.user.role !== UserRole.MAIN_ADMIN && stay.hostelId !== hostelId) {
      throw new ForbiddenError("You are not authorized to view this stay");
    }

    if (stay.foodPlan === "NOT_INCLUDED" || !stay.foodPlanStartDate || !stay.foodPlanEndDate) {
      return NextResponse.json({
        hasActiveUpgrade: false,
        proRataRefund: 0,
        amountPaid: 0,
        totalDays: 0,
        unusedDays: 0,
      });
    }

    const latestUpgradeRequest = await prisma.serviceRequest.findFirst({
      where: {
        stayId: stay.id,
        type: "FOOD_PLAN_UPGRADE",
        status: "VERIFIED",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!latestUpgradeRequest) {
      return NextResponse.json({
        hasActiveUpgrade: false,
        proRataRefund: 0,
        amountPaid: 0,
        totalDays: 0,
        unusedDays: 0,
      });
    }

    const amountPaid = paiseToRupees(latestUpgradeRequest.amountPaise);
    const start = new Date(stay.foodPlanStartDate);
    const end = new Date(stay.foodPlanEndDate);
    const today = new Date();

    // Reset times to compare calendar dates safely
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const totalDays = Math.max(1, differenceInCalendarDays(end, start));

    let unusedDays = 0;
    if (today < start) {
      unusedDays = totalDays;
    } else if (today > end) {
      unusedDays = 0;
    } else {
      const elapsedDays = differenceInCalendarDays(today, start);
      unusedDays = Math.max(0, totalDays - elapsedDays);
    }

    const proRataRefund = parseFloat(((amountPaid * unusedDays) / totalDays).toFixed(2));

    return NextResponse.json({
      hasActiveUpgrade: true,
      amountPaid,
      totalDays,
      unusedDays,
      proRataRefund,
      startDate: stay.foodPlanStartDate,
      endDate: stay.foodPlanEndDate,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { id: stayId } = await params;
    const body = await request.json();
    const { refundAmount, reason } = body;

    if (typeof refundAmount !== "number" || refundAmount < 0) {
      throw new ValidationError("Invalid refund amount");
    }

    if (!reason || typeof reason !== "string") {
      throw new ValidationError("Reason is required");
    }

    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
    });

    if (!stay) {
      throw new NotFoundError("Stay record not found");
    }

    const hostelId = await resolveHostelId(session, request, stay.hostelId);

    if (session.user.role !== UserRole.MAIN_ADMIN && stay.hostelId !== hostelId) {
      throw new ForbiddenError("You are not authorized to modify this stay");
    }

    if (stay.foodPlan === "NOT_INCLUDED") {
      throw new ValidationError("Stay does not have an active food plan upgrade");
    }

    const refundPaise = rupeesToPaise(refundAmount);

    await prisma.$transaction(async (tx) => {
      // 1. Find the latest verified ServiceRequest for FOOD_PLAN_UPGRADE on this stay
      const latestUpgradeRequest = await tx.serviceRequest.findFirst({
        where: {
          stayId: stay.id,
          type: "FOOD_PLAN_UPGRADE",
          status: "VERIFIED",
        },
        orderBy: { createdAt: "desc" },
      });

      if (!latestUpgradeRequest) {
        throw new ValidationError("No verified food upgrade request found for this stay");
      }

      // Assert that refundAmount does not exceed the paid amount
      if (refundPaise > latestUpgradeRequest.amountPaise) {
        throw new ValidationError(
          `Refund amount (₹${refundAmount}) cannot exceed the amount paid for the upgrade (₹${paiseToRupees(
            latestUpgradeRequest.amountPaise
          )})`
        );
      }

      // 2. Revert foodPlan, clear validity dates, decrement foodChargesPaise and totalPayablePaise by the refund amount
      await tx.stay.update({
        where: { id: stay.id },
        data: {
          foodPlan: "NOT_INCLUDED",
          foodPlanStartDate: null,
          foodPlanEndDate: null,
          foodChargesPaise: {
            decrement: refundPaise,
          },
          totalPayablePaise: {
            decrement: refundPaise,
          },
        },
      });

      // 3. Create negative Payment record
      await tx.payment.create({
        data: {
          stayId: stay.id,
          amountPaidPaise: -refundPaise,
          paymentMode: PaymentMode.CASH,
          paymentStatus: PaymentStatus.PAID,
          transactionRefNo: "Revocation Refund",
          notes: reason,
          verifiedByUserId: session.user.id,
          verifiedAt: new Date(),
        },
      });

      // 4. Update service request status and metadata
      const currentMeta = (latestUpgradeRequest.metadata as Record<string, unknown>) || {};
      const updatedMeta = {
        ...currentMeta,
        revocation: {
          reason,
          refundAmount,
          cancelledAt: new Date().toISOString(),
        },
      };

      await tx.serviceRequest.update({
        where: { id: latestUpgradeRequest.id },
        data: {
          status: "REVOKED",
          metadata: updatedMeta,
        },
      });
    });

    revalidatePath(`/admin/hostels/${stay.hostelId}/stays/${stay.id}`);
    revalidatePath(`/warden/stays/${stay.id}`);
    revalidatePath(`/tenant/dashboard`);

    return NextResponse.json({
      success: true,
      message: "Food plan revoked and refund processed successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
