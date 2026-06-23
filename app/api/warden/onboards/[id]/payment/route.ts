import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { verifyAndGetFileType, compressImage } from "@/lib/image";
import { uploadToStorage } from "@/lib/storage";
import { UserRole, DocumentType, DocumentOwnerType } from "@prisma/client";
import { recordPaymentSchema } from "@/lib/validation/payment";
import { recordPayment } from "@/services/payments/payment.service";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

export async function POST(
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
      throw new ForbiddenError("You are not authorized to record payment for this stay");
    }

    const contentType = request.headers.get("content-type") || "";
    let data: z.infer<typeof recordPaymentSchema>;
    let screenshotFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      
      const parsed = recordPaymentSchema.safeParse({
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
      const parsed = recordPaymentSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid payment data");
      }
      data = parsed.data;
    }

    let screenshotDocId: string | null = null;

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

    const payment = await recordPayment({
      stayId: stay.id,
      amountPaid: data.amountPaid,
      paymentMode: data.paymentMode,
      transactionRefNo: data.transactionRefNo,
      receivedBy: data.receivedBy || `User ${session.user.id}`,
      screenshotDocId,
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
