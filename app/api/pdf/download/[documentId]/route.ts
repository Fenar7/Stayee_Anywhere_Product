import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  handleApiError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/errors";
import { getSignedUrl } from "@/lib/storage";
import { UserRole, DocumentOwnerType } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.TENANT, UserRole.MAIN_ADMIN]);
    const { documentId } = await params;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        stay: {
          include: {
            hostel: true,
            tenant: true,
          },
        },
        tenant: true,
      },
    });

    if (!document) {
      throw new NotFoundError("Document not found");
    }

    // Authorization check based on document ownership
    const user = session.user;

    if (user.role === UserRole.WARDEN) {
      if (!user.warden) {
        throw new ForbiddenError("Warden account is not provisioned properly");
      }
      // For stay-owned documents, check if warden manages the stay's hostel
      if (document.ownerType === DocumentOwnerType.STAY && document.stay) {
        if (user.warden.hostelId !== document.stay.hostelId) {
          throw new ForbiddenError("You are not authorized to download this document");
        }
      } else if (document.ownerType === DocumentOwnerType.TENANT && document.tenant) {
        // For tenant-owned documents, check if warden manages the tenant's active stay's hostel
        const activeStay = await prisma.stay.findFirst({
          where: {
            tenantId: document.tenant.id,
            hostelId: user.warden.hostelId,
            status: { in: ["ACTIVE", "EXTENDED"] },
          },
        });
        if (!activeStay) {
          throw new ForbiddenError("You are not authorized to download this document");
        }
      }
    } else if (user.role === UserRole.TENANT) {
      if (!user.tenant) {
        throw new ForbiddenError("Tenant profile is not provisioned properly");
      }
      // Tenant can only access their own documents
      if (document.ownerType === DocumentOwnerType.TENANT && document.tenantId !== user.tenant.id) {
        throw new ForbiddenError("You can only download your own documents");
      }
      if (document.ownerType === DocumentOwnerType.STAY && document.stay) {
        if (document.stay.tenantId !== user.tenant.id) {
          throw new ForbiddenError("You can only download documents from your own stays");
        }
      }
    }
    // MAIN_ADMIN bypasses all checks

    // Generate a short-lived signed URL (15 minutes)
    const signedUrl = await getSignedUrl(document.storagePath, 900);

    return NextResponse.json({
      success: true,
      signedUrl,
      expiresIn: 900,
      documentType: document.documentType,
      storagePath: document.storagePath,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
