import { UserRole, OccupationType, AccommodationType, SharingType, BedStatus } from '@prisma/client';
import { prisma } from '../lib/db';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('Seeding database...');

  // Clean the database in reverse order of relations
  await prisma.stayStatusEvent.deleteMany();
  await prisma.foodOrder.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.refundInvoice.deleteMany();
  await prisma.document.deleteMany();
  await prisma.stay.deleteMany();
  await prisma.onboardingRequest.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.flat.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.warden.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.hostel.deleteMany();
  await prisma.user.deleteMany();

  // Clean Supabase Auth users to start fresh
  console.log('Cleaning auth.users...');
  await prisma.$executeRawUnsafe(`TRUNCATE auth.users CASCADE;`);

  // Helper function to create user in Supabase Auth using admin API
  async function createAuthUser(email: string, password: string): Promise<string> {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error || !data.user) {
      throw new Error(`Failed to create Supabase auth user ${email}: ${error?.message}`);
    }

    return data.user.id;
  }

  // 1. Create Hostel
  console.log('Creating hostel...');
  const hostel = await prisma.hostel.create({
    data: {
      name: 'Hostel Alpha',
      address: '123 Main Road, Mumbai',
      accommodationType: AccommodationType.MENS,
    },
  });

  // 2. Create Floors, Rooms, and Beds
  console.log('Creating floors, rooms, beds...');
  const floor = await prisma.floor.create({
    data: {
      hostelId: hostel.id,
      name: 'First Floor',
      sortOrder: 1,
    },
  });

  const room = await prisma.room.create({
    data: {
      floorId: floor.id,
      roomNumber: '101',
      sharingType: SharingType.DOUBLE,
    },
  });

  await prisma.bed.create({
    data: {
      roomId: room.id,
      label: '101-A',
      status: BedStatus.AVAILABLE,
    },
  });

  await prisma.bed.create({
    data: {
      roomId: room.id,
      label: '101-B',
      status: BedStatus.AVAILABLE,
    },
  });

  // 3. Create Main Admin User
  console.log('Seeding Admin Auth...');
  const adminAuthId = await createAuthUser('admin@nexthome.com', 'password123');

  await prisma.user.create({
    data: {
      supabaseAuthId: adminAuthId,
      phone: '+919999999999',
      email: 'admin@nexthome.com',
      passwordSetAt: new Date(),
      role: UserRole.MAIN_ADMIN,
    },
  });

  // 4. Create Warden User
  console.log('Seeding Warden Auth...');
  const wardenAuthId = await createAuthUser('warden@nexthome.com', 'password123');

  const wardenUser = await prisma.user.create({
    data: {
      supabaseAuthId: wardenAuthId,
      phone: '+918888888888',
      email: 'warden@nexthome.com',
      passwordSetAt: null, // Test first-login flow
      role: UserRole.WARDEN,
    },
  });

  await prisma.warden.create({
    data: {
      userId: wardenUser.id,
      hostelId: hostel.id,
    },
  });

  // 5. Create Tenant User
  console.log('Seeding Tenant Auth...');
  const tenantAuthId = await createAuthUser('tenant@nexthome.com', 'password123');

  const tenantUser = await prisma.user.create({
    data: {
      supabaseAuthId: tenantAuthId,
      phone: '+917777777777',
      email: 'tenant@nexthome.com',
      passwordSetAt: null, // Test first-login flow
      role: UserRole.TENANT,
    },
  });

  await prisma.tenant.create({
    data: {
      userId: tenantUser.id,
      fullName: 'John Tenant',
      dateOfBirth: new Date('2000-01-01'),
      gender: 'MALE',
      placeOfBirth: 'Mumbai',
      permanentAddress: '456 Garden St, Pune',
      emergencyContactName: 'Jane Parent',
      relationship: 'MOTHER',
      emergencyContactNumber: '+917777777778',
      parentGuardianName: 'Bob Parent',
      parentGuardianContact: '+917777777779',
      occupationType: OccupationType.STUDENT,
      collegeName: 'IIT Bombay',
      courseOrBranch: 'Computer Science',
      purposeOfStay: 'Higher Studies',
    },
  });

  console.log('Seeding complete! Log in with:');
  console.log('Admin:   admin@nexthome.com   / password123');
  console.log('Warden:  warden@nexthome.com  / password123');
  console.log('Tenant:  tenant@nexthome.com  / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
