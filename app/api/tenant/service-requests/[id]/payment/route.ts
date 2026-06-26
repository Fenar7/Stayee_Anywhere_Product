import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToStorage } from "@/lib/storage";
import { handleApiError } from "@/lib/errors";
import { UserRole, PaymentMode, PaymentStatus, DocumentOwnerType, DocumentType, ServiceRequestStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const session = await requireRole([UserRole.TENANT]);
    
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: { stay: true },
    });
    
    if (!serviceRequest) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }
    
    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
    });
    
    if (!tenant || serviceRequest.stay.tenantId !== tenant.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    if (serviceRequest.status !== ServiceRequestStatus.PENDING_PAYMENT) {
      return NextResponse.json({ error: "Payment already uploaded or verified" }, { status: 400 });
    }

    const formData = await request.formData();
    const refNo = formData.get("transactionRefNo") as string;
    const file = formData.get("screenshot") as File;
    
    if (!refNo || !file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
    }

    const allowedTypes: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'application/pdf': 'pdf'
    };

    const ext = allowedTypes[file.type];
    if (!ext) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and PDF are allowed." }, { status: 400 });
    }
    
    const path = `payments/sr_${serviceRequest.id}_${Date.now()}.${ext}`;
    
    const storagePath = await uploadToStorage(buffer, path, file.type);
    
    // Create Document, Payment, and update ServiceRequest in a transaction
    await prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          ownerType: DocumentOwnerType.STAY,
          stayId: serviceRequest.stayId,
          tenantId: tenant.id,
          documentType: DocumentType.PAYMENT_SCREENSHOT,
          storagePath,
          fileSizeBytes: file.size,
          uploadedByUserId: session.user.id,
        },
      });
      
      const payment = await tx.payment.create({
        data: {
          stayId: serviceRequest.stayId,
          amountPaidPaise: serviceRequest.amountPaise,
          paymentMode: PaymentMode.UPI,
          transactionRefNo: refNo,
          paymentStatus: PaymentStatus.PENDING,
          screenshotDocumentId: document.id,
        },
      });
      
      const updateResult = await tx.serviceRequest.updateMany({
        where: { id: serviceRequest.id, status: ServiceRequestStatus.PENDING_PAYMENT },
        data: {
          status: ServiceRequestStatus.PAYMENT_UPLOADED,
          paymentId: payment.id,
        },
      });

      if (updateResult.count === 0) {
        throw new Error("CONFLICT_STATUS");
      }
    });
    
    revalidatePath('/tenant');
    revalidatePath(`/tenant/service-requests/${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "CONFLICT_STATUS") {
      return NextResponse.json({ error: "Conflict: Service request status changed" }, { status: 409 });
    }
    return handleApiError(error);
  }
}
