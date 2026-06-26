import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";
import { UserRole, ServiceRequestStatus, PaymentStatus, FoodPlan, ServiceRequestType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole([UserRole.WARDEN]);
    const { id } = await params;
    const body = await request.json();
    const { action } = body; // "approve" or "reject"

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        payment: true,
        stay: true,
      },
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }

    if (serviceRequest.status !== ServiceRequestStatus.PAYMENT_UPLOADED) {
      return NextResponse.json({ error: "Service request not in a verifiable state" }, { status: 400 });
    }

    if (action === "reject") {
      await prisma.$transaction([
        prisma.serviceRequest.update({
          where: { id },
          data: { status: ServiceRequestStatus.REJECTED },
        }),
        ...(serviceRequest.paymentId ? [
          prisma.payment.update({
            where: { id: serviceRequest.paymentId },
            data: { 
              paymentStatus: PaymentStatus.PENDING,
              screenshotDocumentId: null, // Clear the rejected screenshot if needed, or leave it
            },
          })
        ] : []),
      ]);
      revalidatePath("/warden/worklists");
      return NextResponse.json({ success: true, message: "Rejected successfully" });
    }

    // Approve
    await prisma.$transaction(async (tx) => {
      // 1. Mark Payment as PAID
      if (serviceRequest.paymentId) {
        await tx.payment.update({
          where: { id: serviceRequest.paymentId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            verifiedByUserId: user.id,
            verifiedAt: new Date(),
          },
        });
      }

      // 2. Mark ServiceRequest as VERIFIED
      await tx.serviceRequest.update({
        where: { id },
        data: { status: ServiceRequestStatus.VERIFIED },
      });

      // 3. Update Stay record if applicable
      const metadata = serviceRequest.metadata as Record<string, any> | null;
      if (serviceRequest.type === ServiceRequestType.FOOD_PLAN_UPGRADE && metadata?.foodPlan) {
        const newFoodPlan = metadata.foodPlan as FoodPlan;
        const newFoodChargesPaise = metadata.addedFoodChargesPaise 
          ? serviceRequest.stay.foodChargesPaise + Number(metadata.addedFoodChargesPaise)
          : serviceRequest.stay.foodChargesPaise; // Fallback

        // We can just add the SR amount to totalPayablePaise.
        // Wait, if it's already a payment that is PAID, the totalPayablePaise doesn't necessarily need to increase unless we're tracking overall total.
        // Let's assume totalPayablePaise should increase by the service request amount to balance the payment.
        
        await tx.stay.update({
          where: { id: serviceRequest.stayId },
          data: {
            foodPlan: newFoodPlan,
            foodChargesPaise: newFoodChargesPaise,
            totalPayablePaise: { increment: serviceRequest.amountPaise },
          },
        });
      } else {
        // Just increment totalPayablePaise for other types of requests to balance the payment
        await tx.stay.update({
          where: { id: serviceRequest.stayId },
          data: {
            totalPayablePaise: { increment: serviceRequest.amountPaise },
          },
        });
      }
    });

    revalidatePath("/warden/worklists");
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
