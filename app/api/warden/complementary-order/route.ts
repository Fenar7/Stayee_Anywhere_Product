import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireHostelAccess } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, ValidationError } from "@/lib/errors";
import { UserRole, ComplementaryOrderCategory } from "@prisma/client";
import { z } from "zod";
import { PricingService } from "@/services/food/pricing.service";
import { FoodNotificationService } from "@/services/food/notifications.service";
import { logActivity } from "@/services/activity/activity.service";
import { ActivityEventType } from "@prisma/client";

const postSchema = z.object({
  forDate: z.string(), // YYYY-MM-DD
  category: z.nativeEnum(ComplementaryOrderCategory),
  reason: z.string().min(1),
  breakfastQty: z.number().int().min(0).default(0),
  lunchQty: z.number().int().min(0).default(0),
  dinnerQty: z.number().int().min(0).default(0),
}).refine(data => data.breakfastQty > 0 || data.lunchQty > 0 || data.dinnerQty > 0, {
  message: "At least one quantity must be > 0",
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const hostelId = await resolveHostelId(session, request);
    await requireHostelAccess(session, hostelId);

    const body = await request.json();
    const data = postSchema.parse(body);

    const dateObj = new Date(`${data.forDate}T00:00:00.000+05:30`);

    const pricing = await PricingService.getActivePricing(
      session.user.organizationId,
      hostelId,
      dateObj
    );

    if (!pricing) {
      throw new ValidationError("No pricing found for this date.");
    }

    const totalCostPaise =
      data.breakfastQty * pricing.breakfastPricePaise +
      data.lunchQty * pricing.lunchPricePaise +
      data.dinnerQty * pricing.dinnerPricePaise;

    const order = await prisma.complementaryFoodOrder.create({
      data: {
        hostelId,
        forDate: dateObj,
        category: data.category,
        reason: data.reason,
        breakfastQty: data.breakfastQty,
        lunchQty: data.lunchQty,
        dinnerQty: data.dinnerQty,
        totalCostPaise,
        createdByUserId: session.user.id,
      },
    });

    if (session.user.role === UserRole.WARDEN) {
      await FoodNotificationService.notifyAdminComplementaryOrder(order.id, hostelId).catch(console.error);
    }

    await logActivity({
      organizationId: session.user.organizationId,
      hostelId,
      eventType: ActivityEventType.FOOD_COMPLEMENTARY_ORDER_CREATED,
      actorId: session.user.id,
      actorName: session.user.email || session.user.phone || (session.user.role === UserRole.MAIN_ADMIN ? "Admin" : "Warden"),
      subjectName: `Complementary Order - ${data.category}`,
      subjectId: order.id,
      subjectType: "ComplementaryFoodOrder",
    });

    return NextResponse.json(order);
  } catch (error) {
    return handleApiError(error);
  }
}
