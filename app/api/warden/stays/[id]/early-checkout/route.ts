import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { processEarlyCheckout } from "@/services/stays/checkout";
import { prisma } from "@/lib/db";
import { earlyCheckoutSchema } from "@/lib/validation/stay";



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
    const parsed = earlyCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return handleApiError(new Error(parsed.error.issues[0]?.message ?? "Invalid body"));
    }
    const { checkoutDate, refundAmountPaise, notes } = parsed.data;

    const result = await processEarlyCheckout({
      stayId,
      hostelId,
      checkoutDate,
      refundAmountPaise,
      notes,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      refundInvoiceId: result.refundInvoiceId,
      message: "Early checkout processed successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
