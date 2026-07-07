import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { PricingService } from "@/services/food/pricing.service";
import { z } from "zod";

const createPricingSchema = z.object({
  hostelId: z.string().optional().nullable(),
  breakfastPricePaise: z.number().int().min(0),
  lunchPricePaise: z.number().int().min(0),
  dinnerPricePaise: z.number().int().min(0),
  effectiveFrom: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);

    const history = await PricingService.getPricingHistory(session.user.organizationId);

    return Response.json(history);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);

    const body = await request.json();
    const data = createPricingSchema.parse(body);

    const result = await PricingService.createPricingRecord({
      ...data,
      effectiveFrom: new Date(data.effectiveFrom),
      organizationId: session.user.organizationId,
      createdByUserId: session.user.id,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
