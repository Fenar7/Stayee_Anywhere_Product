import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError, NotFoundError, ConflictError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { updateWardenSchema } from "@/lib/validation/hostel";



export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);
    const wardenId = (await params).id;

    const body = await request.json();
    const data = updateWardenSchema.parse(body);

    const warden = await prisma.warden.findUnique({
      where: { id: wardenId },
      include: { user: true },
    });

    if (!warden || warden.user.organizationId !== session.user.organizationId) {
      throw new NotFoundError("Warden not found or access denied");
    }

    // Check email uniqueness if changing to a non-null value
    if (data.email !== undefined && data.email !== null && data.email !== warden.user.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (existingEmail && existingEmail.id !== warden.user.id) {
        throw new ConflictError("This email is already in use");
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: warden.user.id },
      data: {
        email: data.email?.toLowerCase() ?? null,
      },
      select: { id: true, email: true, phone: true },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);
    const wardenId = (await params).id;

    const warden = await prisma.warden.findUnique({
      where: { id: wardenId },
      include: {
        user: true,
        hostel: {
          select: { id: true, name: true, accommodationType: true },
        },
      },
    });

    if (!warden || warden.user.organizationId !== session.user.organizationId) {
      throw new NotFoundError("Warden not found or access denied");
    }

    return NextResponse.json({
      id: warden.id,
      userId: warden.user.id,
      phone: warden.user.phone,
      email: warden.user.email,
      hostel: warden.hostel,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
