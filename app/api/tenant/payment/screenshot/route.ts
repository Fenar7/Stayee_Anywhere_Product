import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { verifyAndGetFileType, compressImage } from "@/lib/image";
import { uploadToStorage } from "@/lib/storage";
import { UserRole, StayStatus, PaymentMode, PaymentStatus, DocumentType, DocumentOwnerType } from "@prisma/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);
    
    // Find the tenant profile
    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
    });

    if (!tenant) {
      throw new NotFoundError("Tenant profile not found");
    }

    // Find the tenant's current stay awaiting payment
    const stay = await prisma.stay.findFirst({
      where: {
        tenantId: tenant.id,
        status: StayStatus.APPROVED_AWAITING_PAYMENT,
      },
    });

    if (!stay) {
      throw new ValidationError("No active stay awaiting payment was found for your account");
    }

    // Parse form data
    const formData = await request.formData();
    const screenshotFile = formData.get("screenshot") as File | null;
    const amountPaidStr = formData.get("amountPaid") as string | null;
    const transactionRefNo = formData.get("transactionRefNo") as string | null;

    if (!screenshotFile || typeof screenshotFile === "string" || typeof screenshotFile.arrayBuffer !== "function") {
      throw new ValidationError("Payment receipt screenshot is required");
    }

    if (!amountPaidStr) {
      throw new ValidationError("Amount paid is required");
    }

    const amountPaid = parseFloat(amountPaidStr);
    if (isNaN(amountPaid) || amountPaid <= 0) {
      throw new ValidationError("Please provide a valid payment amount");
    }

    const amountPaidPaise = Math.round(amountPaid * 100);

    const buffer = Buffer.from(await screenshotFile.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      throw new ValidationError("Screenshot file must be smaller than 5MB");
    }

    const fileType = verifyAndGetFileType(buffer);
    if (fileType !== "jpg" && fileType !== "png") {
      throw new ValidationError("Screenshot must be a JPEG or PNG image");
    }

    // Compress screenshot and upload to private storage
    const compressed = await compressImage(buffer, "document");
    const screenshotPath = `tenants/${tenant.id}/payment_screenshot_${Date.now()}.jpg`;
    await uploadToStorage(compressed.data, screenshotPath, compressed.mimeType);

    const result = await prisma.$transaction(async (tx) => {
      // Create Document record
      const doc = await tx.document.create({
        data: {
          ownerType: DocumentOwnerType.STAY,
          stayId: stay.id,
          documentType: DocumentType.PAYMENT_SCREENSHOT,
          storagePath: screenshotPath,
          fileSizeBytes: compressed.data.length,
          uploadedByUserId: session.user.id,
        },
      });

      // Create Payment record
      const payment = await tx.payment.create({
        data: {
          stayId: stay.id,
          amountPaidPaise,
          paymentMode: PaymentMode.UPI,
          transactionRefNo: transactionRefNo || null,
          receivedBy: "Self-Uploaded (Tenant)",
          paymentStatus: PaymentStatus.PENDING,
          screenshotDocumentId: doc.id,
        },
      });

      return payment;
    });

    return NextResponse.json({
      success: true,
      paymentId: result.id,
      message: "Receipt uploaded successfully. Your warden will verify this payment shortly.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
