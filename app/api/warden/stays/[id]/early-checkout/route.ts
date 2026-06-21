import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { processEarlyCheckout } from "@/services/stays/checkout";

const earlyCheckoutSchema = z.object({
  checkoutDate: z.string().transform((val) => new Date(val)),
  refundAmount: z.number().nonnegative(),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const hostelId = await resolveHostelId(session, request);

    const { id: stayId } = await params;

    const body = await request.json();
    const parsed = earlyCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return handleApiError(new Error(parsed.error.issues[0]?.message ?? "Invalid body"));
    }
    const { checkoutDate, refundAmount, notes } = parsed.data;

    const result = await processEarlyCheckout({
      stayId,
      hostelId,
      checkoutDate,
      refundAmount,
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
