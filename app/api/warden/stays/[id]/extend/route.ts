import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { UserRole, PaymentMode } from "@prisma/client";
import { extendStay } from "@/services/stays/extend";
import { prisma } from "@/lib/db";

const extendSchema = z.object({
  newEndDate: z.string().transform((val) => new Date(val)),
  additionalRent: z.number().nonnegative(),
  additionalFoodCharges: z.number().nonnegative(),
  paymentMode: z.nativeEnum(PaymentMode).default(PaymentMode.UPI),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { id: stayId } = await params;

    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
      select: { hostelId: true },
    });

    if (!stay) {
      throw new NotFoundError("Stay record not found");
    }

    const hostelId = await resolveHostelId(session, request, stay.hostelId);

    const body = await request.json();
    const parsed = extendSchema.safeParse(body);
    if (!parsed.success) {
      return handleApiError(new Error(parsed.error.issues[0]?.message ?? "Invalid body"));
    }
    const { newEndDate, additionalRent, additionalFoodCharges, paymentMode } = parsed.data;

    await extendStay({
      stayId,
      hostelId,
      newEndDate,
      additionalRent,
      additionalFoodCharges,
      paymentMode,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Stay successfully extended",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
