import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, ValidationError, NotFoundError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        tenant: true,
      },
    });

    if (!user || !user.tenant) {
      throw new NotFoundError("Tenant profile not found");
    }

    return NextResponse.json({
      user: {
        email: user.email,
        phone: user.phone,
      },
      tenant: {
        fullName: user.tenant.fullName,
        gender: user.tenant.gender,
        dateOfBirth: user.tenant.dateOfBirth,
        photoUrl: user.tenant.photoUrl,
        emergencyContactName: user.tenant.emergencyContactName,
        emergencyContactNumber: user.tenant.emergencyContactNumber,
        relationship: user.tenant.relationship,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import { z } from "zod";

const settingsUpdateSchema = z.object({
  email: z.union([z.literal(""), z.string().email("Invalid email format")]).optional(),
  emergencyContactName: z.string().max(100, "Name is too long").optional(),
  emergencyContactNumber: z.string().max(20, "Number is too long").optional(),
  relationship: z.string().max(50, "Relationship is too long").optional(),
  photoUrl: z.string().url("Invalid URL").optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);
    const body = await request.json();

    const parseResult = settingsUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError(parseResult.error.issues[0]?.message ?? "Invalid data format");
    }

    const { email, emergencyContactName, emergencyContactNumber, relationship, photoUrl } = parseResult.data;

    // Update User (Email only)
    if (email !== undefined) {
      try {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { email: email === "" ? null : email },
        });
      } catch (e: any) {
        if (e.code === "P2002") {
          throw new ValidationError("Email is already in use by another account");
        }
        throw e;
      }
    }

    // Update Tenant
    const tenantUpdateData: any = {};
    if (emergencyContactName !== undefined) tenantUpdateData.emergencyContactName = emergencyContactName;
    if (emergencyContactNumber !== undefined) tenantUpdateData.emergencyContactNumber = emergencyContactNumber;
    if (relationship !== undefined) tenantUpdateData.relationship = relationship;
    if (photoUrl !== undefined) tenantUpdateData.photoUrl = photoUrl;

    if (Object.keys(tenantUpdateData).length > 0) {
      const tenantExists = await prisma.tenant.findUnique({ where: { userId: session.user.id } });
      if (!tenantExists) {
        throw new NotFoundError("Tenant profile not found");
      }
      
      await prisma.tenant.update({
        where: { userId: session.user.id },
        data: tenantUpdateData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
