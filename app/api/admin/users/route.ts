import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";
import { getSignedUrl } from "@/lib/storage";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);

    const users = await prisma.user.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        warden: {
          include: {
            hostel: {
              select: { id: true, name: true },
            },
          },
        },
        tenant: {
          include: {
            documents: {
              select: {
                id: true,
                documentType: true,
                storagePath: true,
              },
            },
            stays: {
              include: {
                hostel: {
                  select: { id: true, name: true },
                },
                bed: {
                  include: {
                    room: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    // Map through users to generate signed URLs for profile photos
    const mappedUsers = await Promise.all(
      users.map(async (u) => {
        if (!u.tenant) return u;

        const profilePhotoDoc = u.tenant.documents.find(
          (d) => d.documentType === "PROFILE_PHOTO"
        );

        let photoUrl = null;
        if (profilePhotoDoc) {
          try {
            photoUrl = await getSignedUrl(profilePhotoDoc.storagePath);
          } catch (err) {
            console.error(`Failed to sign profile photo URL for user ${u.id}:`, err);
          }
        }

        return {
          ...u,
          tenant: {
            ...u.tenant,
            photoUrl,
            documents: undefined, // Omit detailed documents list in general directory view
          },
        };
      })
    );

    return NextResponse.json({ users: mappedUsers });
  } catch (error) {
    return handleApiError(error);
  }
}
