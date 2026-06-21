import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { verifyAndGetFileType, compressImage } from "@/lib/image";
import { uploadToStorage } from "@/lib/storage";
import { UserRole, StayStatus, PaymentMode, PaymentStatus, DocumentType, DocumentOwnerType } from "@prisma/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

const paymentSchema = z.object({
  amountPaid: z.preprocess((val) => Number(val), z.number().positive("Amount paid must be positive")),
  paymentMode: z.nativeEnum(PaymentMode),
  transactionRefNo: z.string().nullable().optional(),
  receivedBy: z.string().nullable().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    const warden = session.user.warden!;
    const hostelId = warden.hostelId;

    const { id: stayId } = await params;

    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
    });

    if (!stay) {
      throw new NotFoundError("Stay record not found");
    }

    if (stay.hostelId !== hostelId) {
      throw new ForbiddenError("You are not authorized to record payment for this stay");
    }

    if (stay.status !== StayStatus.APPROVED_AWAITING_PAYMENT) {
      throw new ValidationError(`Cannot record payment for stay in status: ${stay.status}`);
    }

    // Determine content type (FormData vs JSON)
    const contentType = request.headers.get("content-type") || "";
    let data: z.infer<typeof paymentSchema>;
    let screenshotFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      
      const parsed = paymentSchema.safeParse({
        amountPaid: formData.get("amountPaid"),
        paymentMode: formData.get("paymentMode"),
        transactionRefNo: formData.get("transactionRefNo"),
        receivedBy: formData.get("receivedBy"),
      });

      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid payment data");
      }
      data = parsed.data;
      screenshotFile = formData.get("screenshot") as File | null;
    } else {
      const body = await request.json();
      const parsed = paymentSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid payment data");
      }
      data = parsed.data;
    }

    const { amountPaid, paymentMode, transactionRefNo, receivedBy } = data;
    const amountPaidPaise = Math.round(amountPaid * 100);

    // If UPI/Bank transfer, ref no is required
    if (
      (paymentMode === PaymentMode.UPI || paymentMode === PaymentMode.BANK_TRANSFER) &&
      !transactionRefNo?.trim()
    ) {
      throw new ValidationError("Transaction reference number is required for UPI or Bank Transfer payments");
    }

    let screenshotDocId: string | null = null;

    // Handle screenshot upload if present
    if (screenshotFile && typeof screenshotFile !== "string" && typeof screenshotFile.arrayBuffer === "function") {
      const buffer = Buffer.from(await screenshotFile.arrayBuffer());
      if (buffer.length > MAX_FILE_SIZE) {
        throw new ValidationError("Screenshot file must be smaller than 5MB");
      }

      const fileType = verifyAndGetFileType(buffer);
      if (fileType !== "jpg" && fileType !== "png") {
        throw new ValidationError("Screenshot must be a JPEG or PNG image");
      }

      const compressed = await compressImage(buffer, "document");
      const screenshotPath = `tenants/${stay.tenantId}/payment_screenshot_${Date.now()}.jpg`;
      await uploadToStorage(compressed.data, screenshotPath, compressed.mimeType);

      // Create Document record
      const doc = await prisma.document.create({
        data: {
          ownerType: DocumentOwnerType.STAY,
          stayId: stay.id,
          documentType: DocumentType.PAYMENT_SCREENSHOT,
          storagePath: screenshotPath,
          fileSizeBytes: compressed.data.length,
          uploadedByUserId: session.user.id,
        },
      });
      screenshotDocId = doc.id;
    }

    // Create unverified Payment record (status PENDING)
    const payment = await prisma.payment.create({
      data: {
        stayId: stay.id,
        amountPaidPaise,
        paymentMode,
        transactionRefNo: transactionRefNo || null,
        receivedBy: receivedBy || `Warden ${warden.id}`,
        paymentStatus: PaymentStatus.PENDING,
        screenshotDocumentId: screenshotDocId,
      },
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      message: "Payment recorded successfully, awaiting verification",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
