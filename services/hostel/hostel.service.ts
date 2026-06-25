import { prisma } from "@/lib/db";
import { createAdminClient } from "@/lib/auth/server";
import { ConflictError, ValidationError } from "@/lib/errors";
import { UserRole, AccommodationType } from "@prisma/client";

export interface CreateHostelInput {
  name: string;
  address: string;
  accommodationType: AccommodationType;
  wardenEmail: string;
  wardenPhone: string;
  wardenPassword: string;
  locationId?: string | null;
  organizationId: string;
}

export async function createHostelWithWarden(input: CreateHostelInput) {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: input.wardenEmail.toLowerCase() },
        { phone: input.wardenPhone },
      ],
      organizationId: input.organizationId,
    },
  });

  if (existingUser) {
    throw new ConflictError("A user with this email or phone already exists");
  }

  const supabase = createAdminClient();
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: input.wardenEmail,
    password: input.wardenPassword,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new ValidationError(`Failed to create auth user: ${authError?.message}`);
  }

  const supabaseAuthId = authData.user.id;

  try {
    const [dbUser, hostel] = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          supabaseAuthId,
          phone: input.wardenPhone,
          email: input.wardenEmail.toLowerCase(),
          passwordSetAt: null,
          plainTextPassword: input.wardenPassword,
          role: UserRole.WARDEN,
          organizationId: input.organizationId,
        },
      });

      const hostel = await tx.hostel.create({
        data: {
          name: input.name,
          address: input.address,
          accommodationType: input.accommodationType,
          locationId: input.locationId || null,
          organizationId: input.organizationId,
        },
      });

      await tx.warden.create({
        data: {
          userId: user.id,
          hostelId: hostel.id,
        },
      });

      return [user, hostel];
    });

    return {
      hostel: {
        id: hostel.id,
        name: hostel.name,
        address: hostel.address,
        accommodationType: hostel.accommodationType,
        locationId: hostel.locationId || null,
      },
      warden: {
        id: dbUser.id,
        email: dbUser.email,
        phone: dbUser.phone,
      },
    };
  } catch (error) {
    await supabase.auth.admin.deleteUser(supabaseAuthId).catch(() => {});
    throw error;
  }
}
