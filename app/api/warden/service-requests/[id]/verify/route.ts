import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";
import { UserRole, ServiceRequestStatus, PaymentStatus, FoodPlan, ServiceRequestType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createNotification } from "@/lib/notifications/trigger";

const MetadataSchema = z.object({
  foodPlan: z.string().optional(),
  days: z.number().int().positive().optional(),
  addedFoodChargesPaise: z.number().int().nonnegative().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format (must be YYYY-MM-DD)").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format (must be YYYY-MM-DD)").optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
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
        stay: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }

    if (serviceRequest.status !== ServiceRequestStatus.PAYMENT_UPLOADED) {
      return NextResponse.json({ error: "Service request not in a verifiable state" }, { status: 400 });
    }

    if (action === "reject") {
      const updatedReqs = await prisma.serviceRequest.updateMany({
        where: { id, status: ServiceRequestStatus.PAYMENT_UPLOADED },
        data: { status: ServiceRequestStatus.REJECTED },
      });
      if (updatedReqs.count === 0) {
        return NextResponse.json({ error: "Service request status changed during process" }, { status: 409 });
      }
      
      if (serviceRequest.paymentId) {
        await prisma.payment.update({
          where: { id: serviceRequest.paymentId },
          data: { 
            paymentStatus: PaymentStatus.PENDING,
            screenshotDocumentId: null, // Clear the rejected screenshot if needed, or leave it
          },
        });
      }

      if (serviceRequest.stay.tenant?.userId) {
        await createNotification({
          userId: serviceRequest.stay.tenant.userId,
          title: "Payment Rejected",
          message: `Your payment for ${serviceRequest.type.replace(/_/g, " ").toLowerCase()} has been rejected by the warden.`,
          type: "PAYMENT",
        });
      }

      revalidatePath("/warden/worklists");
      revalidatePath(`/warden/service-requests/${id}`);
      return NextResponse.json({ success: true, message: "Rejected successfully" });
    }

    // Approve
    let metadata: z.infer<typeof MetadataSchema> = {};
    if (serviceRequest.metadata) {
       const parsed = MetadataSchema.safeParse(serviceRequest.metadata);
       if (!parsed.success) {
         return NextResponse.json({ error: "Invalid service request metadata" }, { status: 400 });
       }
       metadata = parsed.data;
     }

    await prisma.$transaction(async (tx) => {
      // 1. Mark ServiceRequest as VERIFIED and check idempotency
      const updatedReqs = await tx.serviceRequest.updateMany({
        where: { id, status: ServiceRequestStatus.PAYMENT_UPLOADED },
        data: { status: ServiceRequestStatus.VERIFIED },
      });
      if (updatedReqs.count === 0) {
        throw new Error("Service request status changed during process");
      }

      // 2. Mark Payment as PAID
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

      // 3. Update Stay record if applicable
      if (serviceRequest.type === ServiceRequestType.FOOD_PLAN_UPGRADE && metadata?.foodPlan) {
        const newFoodPlan = metadata.foodPlan as FoodPlan;
        const newFoodChargesPaise = metadata.addedFoodChargesPaise 
          ? serviceRequest.stay.foodChargesPaise + metadata.addedFoodChargesPaise
          : serviceRequest.stay.foodChargesPaise; // Fallback
        
        const start = metadata.startDate ? new Date(metadata.startDate) : new Date();
        const end = metadata.endDate ? new Date(metadata.endDate) : new Date();

        await tx.stay.update({
          where: { id: serviceRequest.stayId },
          data: {
            foodPlan: newFoodPlan,
            foodChargesPaise: newFoodChargesPaise,
            foodPlanStartDate: start,
            foodPlanEndDate: end,
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

    if (serviceRequest.stay.tenant?.userId) {
      await createNotification({
        userId: serviceRequest.stay.tenant.userId,
        title: "Payment Verified",
        message: `Your payment for ${serviceRequest.type.replace(/_/g, " ").toLowerCase()} has been verified.`,
        type: "PAYMENT",
      });
    }

    revalidatePath("/warden/worklists");
    revalidatePath(`/warden/service-requests/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Service request status changed during process") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return handleApiError(error);
  }
}
