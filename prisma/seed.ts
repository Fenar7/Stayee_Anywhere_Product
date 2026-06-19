import { UserRole, OccupationType, AccommodationType, SharingType, BedStatus } from '@prisma/client';
import { prisma } from '../lib/db';

// Hash for 'password123'
const PASSWORD_HASH = '$2a$10$YnS.eN67rX.D.BqW/N47UeXWvQ0q0fTzZp8cW3hXm2MvF6I1M2n9u';

async function main() {
  console.log('Seeding database...');

  // Clean the database
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

  // Clean Supabase Auth users
  await prisma.$executeRawUnsafe(`TRUNCATE auth.users CASCADE;`);

  // 1. Create Hostel
  const hostel = await prisma.hostel.create({
    data: {
      name: 'Hostel Alpha',
      address: '123 Main Road, Mumbai',
      accommodationType: AccommodationType.MENS,
    },
  });

  // 2. Create Floors, Rooms, and Beds
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
  const adminAuthId = '55555555-5555-5555-5555-555555555555';
  await prisma.$executeRawUnsafe(`
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('${adminAuthId}', 'admin@nexthome.com', '${PASSWORD_HASH}', now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}', now(), now());
  `);

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
  const wardenAuthId = '66666666-6666-6666-6666-666666666666';
  await prisma.$executeRawUnsafe(`
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('${wardenAuthId}', 'warden@nexthome.com', '${PASSWORD_HASH}', now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}', now(), now());
  `);

  const wardenUser = await prisma.user.create({
    data: {
      supabaseAuthId: wardenAuthId,
      phone: '+918888888888',
      email: 'warden@nexthome.com',
      passwordSetAt: null, // First login redirect test!
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
  const tenantAuthId = '77777777-7777-7777-7777-777777777777';
  await prisma.$executeRawUnsafe(`
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('${tenantAuthId}', 'tenant@nexthome.com', '${PASSWORD_HASH}', now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}', now(), now());
  `);

  const tenantUser = await prisma.user.create({
    data: {
      supabaseAuthId: tenantAuthId,
      phone: '+917777777777',
      email: 'tenant@nexthome.com',
      passwordSetAt: null, // First login redirect test!
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
