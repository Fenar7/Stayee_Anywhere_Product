import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifyAndGetFileType, compressImage } from "@/lib/image";
import { uploadToStorage } from "@/lib/storage";
import { createAdminClient } from "@/lib/auth/server";
import { paymentConfigSchema } from "@/lib/validation/payment";



export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole([UserRole.MAIN_ADMIN]);
    const hostelId = (await params).id;

    const hostel = await prisma.hostel.findUnique({ where: { id: hostelId } });
    if (!hostel) throw new NotFoundError("Hostel not found");

    const config = await prisma.hostelPaymentConfig.findUnique({
      where: { hostelId },
    });

    let qrCodeUrl: string | null = null;
    if (config?.qrCodePath) {
      const supabase = createAdminClient();
      const { data } = await supabase.storage
        .from("tenant-documents")
        .createSignedUrl(config.qrCodePath, 3600);
      qrCodeUrl = data?.signedUrl || null;
    }

    return NextResponse.json({
      upiId: config?.upiId || null,
      qrCodePath: config?.qrCodePath || null,
      qrCodeUrl,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole([UserRole.MAIN_ADMIN]);
    const hostelId = (await params).id;

    const hostel = await prisma.hostel.findUnique({ where: { id: hostelId } });
    if (!hostel) throw new NotFoundError("Hostel not found");

    const formData = await request.formData();
    const upiId = formData.get("upiId") as string | null;
    const qrFile = formData.get("qrCode") as File | null;

    // Validate UPI ID length
    if (upiId && upiId.length > 100) {
      return NextResponse.json(
        { error: "UPI ID must be under 100 characters" },
        { status: 400 }
      );
    }

    let qrCodePath: string | null | undefined = undefined;

    // Upload QR code if provided
    if (qrFile && typeof qrFile.arrayBuffer === "function") {
      const buffer = Buffer.from(await qrFile.arrayBuffer());
      if (buffer.length > 2 * 1024 * 1024) {
        return NextResponse.json(
          { error: "QR code image must be smaller than 2MB" },
          { status: 400 }
        );
      }
      const fileType = verifyAndGetFileType(buffer);
      if (fileType !== "jpg" && fileType !== "png") {
        return NextResponse.json(
          { error: "QR code must be a JPEG or PNG image" },
          { status: 400 }
        );
      }
      const compressed = await compressImage(buffer, "document");
      const path = `hostels/${hostelId}/qr_code_${Date.now()}.jpg`;
      await uploadToStorage(compressed.data, path, compressed.mimeType);
      qrCodePath = path;
    }

    const data: Record<string, unknown> = {};
    if (upiId !== null) data.upiId = upiId || null;
    if (qrCodePath !== undefined) data.qrCodePath = qrCodePath;

    const config = await prisma.hostelPaymentConfig.upsert({
      where: { hostelId },
      update: data,
      create: {
        hostelId,
        upiId: (upiId as string) || null,
        qrCodePath: qrCodePath || null,
      },
    });

    return NextResponse.json({
      upiId: config.upiId,
      qrCodePath: config.qrCodePath,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
