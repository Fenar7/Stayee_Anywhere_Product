// @ts-nocheck
import { UserRole, OccupationType, AccommodationType, SharingType, BedStatus, StayStatus, DurationType, FoodPlan, FoodBillingMode, TopUpStatus } from '@prisma/client';
import { prisma } from '../lib/db';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials in .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Seeding database with Next Home dummy data...');

  // Clean the database in reverse order of relations
  await prisma.taskComment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.stayStatusEvent.deleteMany();
  await prisma.foodOrder.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.refundInvoice.deleteMany();
  await prisma.document.deleteMany();
  await prisma.stay.deleteMany();
  await prisma.onboardingRequest.deleteMany();
  await prisma.leadNote.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.flat.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.warden.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.hostelPaymentConfig.deleteMany();
  await prisma.hostel.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();
  await prisma.organization.deleteMany();

  // Clean Supabase Auth users to start fresh
  console.log('Cleaning auth.users...');
  try {
    await prisma.$executeRawUnsafe(`TRUNCATE auth.users CASCADE;`);
  } catch (e) {
    console.log("Could not truncate auth.users automatically. If auth issues occur, you may need to clear them via the Supabase dashboard.");
  }

  // Helper function to create user in Supabase Auth
  async function createAuthUser(email: string, password: string): Promise<string> {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error || !data.user) {
      if (error?.message.includes("already registered")) {
        console.log(`Auth user ${email} already exists in Supabase. Using existing.`);
        const { data: list } = await supabase.auth.admin.listUsers();
        const user = list?.users?.find(u => u.email === email);
        if (user) return user.id;
      }
      throw new Error(`Failed to create Supabase auth user ${email}: ${error?.message}`);
    }

    return data.user.id;
  }

  // 1. Create Organization
  console.log('Creating organization "Next Home"...');
  const org = await prisma.organization.create({
    data: {
      name: 'Next Home',
      domain: 'nexthome.io',
      brandColor: '#2563EB',
    },
  });

  // 1.5 Create Location
  const location = await prisma.location.create({
    data: {
      name: 'Bangalore, Koramangala'
    }
  });

  // 2. Create Admin
  const adminEmail = 'admin@nexthome.io';
  const adminPassword = 'Password@123';
  console.log('Creating Admin User...');
  const adminAuthId = await createAuthUser(adminEmail, adminPassword);
  const admin = await prisma.user.create({
    data: {
      supabaseAuthId: adminAuthId,
      email: adminEmail,
      phone: '9999999990',
      role: UserRole.MAIN_ADMIN,
      passwordSetAt: new Date(),
      organizationId: org.id,
    },
  });

  // 3. Create Hostels & Structure
  const hostelsInfo = [
    { name: 'NextHome Paradise', type: AccommodationType.MENS, wardenName: 'John', prefix: 'NHP' },
    { name: 'NextHome Oasis', type: AccommodationType.WOMENS, wardenName: 'Sarah', prefix: 'NHO' },
    { name: 'NextHome Central', type: AccommodationType.MENS, wardenName: 'Mike', prefix: 'NHC' },
  ];

  const createdHostels = [];

  for (let i = 0; i < hostelsInfo.length; i++) {
    const info = hostelsInfo[i];
    console.log(`Creating Hostel: ${info.name}...`);
    
    const hostel = await prisma.hostel.create({
      data: {
        name: info.name,
        address: `Block ${i + 1}, ${location.name}`,
        accommodationType: info.type,
        locationId: location.id,
        organizationId: org.id,
      },
    });
    createdHostels.push(hostel);

    // Warden
    const wardenEmail = `warden.${info.prefix.toLowerCase()}@nexthome.io`;
    const wardenPassword = 'Password@123';
    const wardenAuthId = await createAuthUser(wardenEmail, wardenPassword);
    
    await prisma.user.create({
      data: {
        supabaseAuthId: wardenAuthId,
        email: wardenEmail,
        phone: `888888888${i}`,
        role: UserRole.WARDEN,
        passwordSetAt: new Date(),
        organizationId: org.id,
        warden: {
          create: {
            hostelId: hostel.id,
          }
        }
      },
    });

    // Structure (1 Floor, 2 Rooms, 4 Beds)
    const floor = await prisma.floor.create({
      data: { hostelId: hostel.id, name: 'Ground Floor', sortOrder: 1 }
    });

    for (let r = 1; r <= 2; r++) {
      const room = await prisma.room.create({
        data: { floorId: floor.id, roomNumber: `G0${r}`, sharingType: SharingType.DOUBLE }
      });

      await prisma.bed.create({
        data: { roomId: room.id, label: `G0${r}-A`, status: BedStatus.AVAILABLE }
      });
      await prisma.bed.create({
        data: { roomId: room.id, label: `G0${r}-B`, status: BedStatus.AVAILABLE }
      });
    }

    // Payment config
    await prisma.hostelPaymentConfig.create({
      data: {
        hostelId: hostel.id,
        upiId: `nexthome${info.prefix.toLowerCase()}@hdfc`,
      }
    });

    // Add some leads
    await prisma.lead.create({
      data: {
        hostelId: hostel.id,
        organizationId: org.id,
        phone: `777777777${i}`,
        source: 'MANUAL',
        status: 'NEW',
        notes: {
          create: {
            note: 'Inquired about double sharing.',
            authorId: admin.id
          }
        }
      }
    });
  }

  // 4. Create Active Tenants for the first hostel (NextHome Paradise)
  const mainHostel = createdHostels[0];
  const firstRoom = await prisma.room.findFirst({
    where: { floor: { hostelId: mainHostel.id } },
    include: { beds: true }
  });

  if (firstRoom && firstRoom.beds.length >= 2) {
    console.log('Creating Tenants and Active Stays...');

    // Tenant 1
    const t1Email = 'tenant1@nexthome.io';
    const t1Password = 'Password@123';
    const t1AuthId = await createAuthUser(t1Email, t1Password);
    
    const t1User = await prisma.user.create({
      data: {
        supabaseAuthId: t1AuthId,
        email: t1Email,
        phone: '9111111111',
        role: UserRole.TENANT,
        passwordSetAt: new Date(),
        organizationId: org.id,
      }
    });

    const tenant1 = await prisma.tenant.create({
      data: {
        userId: t1User.id,
        fullName: 'Rahul Sharma',
        gender: 'MALE',
        dateOfBirth: new Date('1998-05-15'),
        permanentAddress: 'Delhi',
        emergencyContactNumber: '9111111112',
      }
    });

    // Mark bed occupied
    await prisma.bed.update({
      where: { id: firstRoom.beds[0].id },
      data: { status: BedStatus.OCCUPIED }
    });

    // Active Stay
    await prisma.stay.create({
      data: {
        tenantId: tenant1.id,
        bedId: firstRoom.beds[0].id,
        hostelId: mainHostel.id,
        status: StayStatus.ACTIVE,
        durationType: DurationType.MONTHLY,
        joiningDate: new Date(),
        endDate: new Date('2027-01-01'),
        isNewAdmission: true,
        admissionFeePaise: 100000,
        monthlyRentPaise: 1500000, // 15,000 INR
        securityDepositPaise: 3000000, // 30,000 INR
        foodChargesPaise: 0,
        discountPaise: 0,
        totalPayablePaise: 4500000,
      }
    });

    // Tenant 2
    const t2Email = 'tenant2@nexthome.io';
    const t2Password = 'Password@123';
    const t2AuthId = await createAuthUser(t2Email, t2Password);
    
    const t2User = await prisma.user.create({
      data: {
        supabaseAuthId: t2AuthId,
        email: t2Email,
        phone: '9222222222',
        role: UserRole.TENANT,
        passwordSetAt: new Date(),
        organizationId: org.id,
      }
    });

    const tenant2 = await prisma.tenant.create({
      data: {
        userId: t2User.id,
        fullName: 'Amit Kumar',
        gender: 'MALE',
        dateOfBirth: new Date('1999-08-20'),
        permanentAddress: 'Mumbai',
        emergencyContactNumber: '9222222223',
      }
    });

    // Mark bed occupied
    await prisma.bed.update({
      where: { id: firstRoom.beds[1].id },
      data: { status: BedStatus.OCCUPIED }
    });

    // Active Stay
    await prisma.stay.create({
      data: {
        tenantId: tenant2.id,
        bedId: firstRoom.beds[1].id,
        hostelId: mainHostel.id,
        status: StayStatus.ACTIVE,
        durationType: DurationType.DAILY,
        joiningDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 10)),
        isNewAdmission: false,
        admissionFeePaise: 0,
        monthlyRentPaise: 50000, // 500 INR per day
        securityDepositPaise: 100000,
        foodChargesPaise: 0,
        discountPaise: 0,
        totalPayablePaise: 600000,
        foodPlan: FoodPlan.NOT_INCLUDED,
        foodBillingMode: FoodBillingMode.POSTPAID,
      }
    });

    console.log('Seeding Food Billing Configurations & Mock Data...');
    
    // 5. Global Food Pricing
    const globalPricing = await prisma.foodPricing.create({
      data: {
        organizationId: org.id,
        breakfastPricePaise: 5000, // 50 INR
        lunchPricePaise: 8000,
        dinnerPricePaise: 8000,
        effectiveFrom: new Date('2024-01-01'),
        createdByUserId: admin.id,
      }
    });

    // 6. FoodBillingCycles for active tenants
    const tenant1Stay = await prisma.stay.findFirst({ where: { tenantId: tenant1.id }});
    const tenant2Stay = await prisma.stay.findFirst({ where: { tenantId: tenant2.id }});

    if (tenant1Stay) {
      // Setup prepaid monthly subscription
      await prisma.stay.update({
        where: { id: tenant1Stay.id },
        data: { foodPlan: FoodPlan.BLD, foodBillingMode: FoodBillingMode.FLAT_RATE }
      });
      
      const t1Cycle = await prisma.foodBillingCycle.create({
        data: {
          stayId: tenant1Stay.id,
          cycleStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          cycleEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999),
          status: "OPEN",
          breakfastPricePaise: 5000,
          lunchPricePaise: 8000,
          dinnerPricePaise: 8000,
          totalConsumedPaise: 0,
          totalPaidPaise: 450000,
        }
      });

      // Give them a topup
      await prisma.foodWalletTopUp.create({
        data: {
          stayId: tenant1Stay.id,
          cycleId: t1Cycle.id,
          amountPaise: 450000,
          status: TopUpStatus.APPROVED,
          approvedByUserId: admin.id,
          createdAt: new Date(),
        }
      });
    }

    if (tenant2Stay) {
      const t2Cycle = await prisma.foodBillingCycle.create({
        data: {
          stayId: tenant2Stay.id,
          cycleStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          cycleEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999),
          status: "OPEN",
          breakfastPricePaise: 5000,
          lunchPricePaise: 8000,
          dinnerPricePaise: 8000,
          totalConsumedPaise: 13000, // 50+80
          totalPaidPaise: 0,
        }
      });

      // Some orders
      await prisma.foodOrder.create({
        data: {
          stayId: tenant2Stay.id,
          forDate: new Date(),
          breakfast: true,
          lunch: true,
          dinner: false,
          confirmedAt: new Date(),
        }
      });
    }

    console.log('Seeding Tasks...');
    // Create Tasks for Warden 1 (Hostel 1)
    const wardenUser = await prisma.user.findFirst({
      where: { role: UserRole.WARDEN, warden: { hostelId: mainHostel.id } },
      include: { warden: true }
    });

    if (wardenUser && wardenUser.warden) {
      await prisma.task.create({
        data: {
          organizationId: org.id,
          createdByUserId: admin.id,
          assignedToWardenId: wardenUser.warden.id,
          hostelId: mainHostel.id,
          title: 'Do Grocery Purchases',
          description: 'Need to restock on rice and dal for next week.',
          priority: 'HIGH',
          status: 'PENDING',
          deadline: new Date(new Date().setHours(15, 33, 0, 0)), // Today 3:33 PM
        }
      });

      await prisma.task.create({
        data: {
          organizationId: org.id,
          createdByUserId: admin.id,
          assignedToWardenId: wardenUser.warden.id,
          hostelId: mainHostel.id,
          title: 'Onboard Ashiq',
          description: 'New tenant arriving today, please complete onboarding.',
          priority: 'MEDIUM',
          status: 'PENDING',
          deadline: new Date(new Date().setDate(new Date().getDate() + 1)), // Tomorrow
        }
      });
    }
  }

  console.log('\n=============================================');
  console.log('✅ DATABASE SEEDING COMPLETE! 🎉');
  console.log('=============================================');
  console.log('You can now log in using the following credentials:');
  console.log('\n🛡️ MAIN ADMIN');
  console.log('Email:     admin@nexthome.io');
  console.log('Password:  Password@123');
  
  console.log('\n🏢 WARDENS');
  console.log('Hostel 1:  warden.nhp@nexthome.io');
  console.log('Hostel 2:  warden.nho@nexthome.io');
  console.log('Hostel 3:  warden.nhc@nexthome.io');
  console.log('Password:  Password@123 (for all)');

  console.log('\n🛏️ TENANTS (Active in Hostel 1)');
  console.log('Tenant 1:  tenant1@nexthome.io');
  console.log('Tenant 2:  tenant2@nexthome.io');
  console.log('Password:  Password@123 (for all)');
  console.log('=============================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
