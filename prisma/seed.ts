import { UserRole, AccommodationType, SharingType, BedStatus, StayStatus, DurationType, FoodPlan, FoodBillingMode, TopUpStatus } from '@prisma/client';
import { prisma } from '../lib/db';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials in .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Utility to delay execution (prevents Supabase rate limits)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('Seeding database with Next Home mock data (5 Hostels, 50 Tenants)...');

  // Clean the database in reverse order of relations
  console.log('Cleaning up existing data...');
  await prisma.activityLog.deleteMany();
  await prisma.foodSettlementStatement.deleteMany();
  await prisma.foodWalletTopUp.deleteMany();
  await prisma.foodBillingCycle.deleteMany();
  await prisma.ticketComment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.notification.deleteMany();
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
  await prisma.foodPricing.deleteMany();
  await prisma.hostel.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();
  await prisma.organization.deleteMany();

  // Clean Supabase Auth users
  console.log('Cleaning auth.users in Supabase...');
  try {
    await prisma.$executeRawUnsafe(`TRUNCATE auth.users CASCADE;`);
  } catch (e) {
    console.log("Could not truncate auth.users automatically. If auth issues occur, you may need to clear them via the Supabase dashboard.");
  }

  // Helper function to create user in Supabase Auth
  async function createAuthUser(email: string, password: string): Promise<string> {
    await delay(300); // 300ms delay to avoid rate limits
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error || !data.user) {
      if (error?.message.includes("already registered")) {
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

  // 1.5 Create Locations
  const locKoramangala = await prisma.location.create({ data: { name: 'Koramangala' } });
  const locHSR = await prisma.location.create({ data: { name: 'HSR Layout' } });
  const locIndiranagar = await prisma.location.create({ data: { name: 'Indiranagar' } });

  // 2. Create Global Admin
  const adminEmail = 'admin@nexthome.io';
  const commonPassword = 'Password@123';
  console.log('Creating Admin User...');
  const adminAuthId = await createAuthUser(adminEmail, commonPassword);
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

  // 3. Global Food Pricing
  const globalPricing = await prisma.foodPricing.create({
    data: {
      organizationId: org.id,
      breakfastPricePaise: 5000, // ₹50
      lunchPricePaise: 8000,     // ₹80
      dinnerPricePaise: 8000,    // ₹80
      effectiveFrom: new Date('2024-01-01'),
      createdByUserId: admin.id,
    }
  });

  // 4. Hostels Data
  const hostelsInfo = [
    { name: 'NextHome Paradise', type: AccommodationType.MENS, locId: locKoramangala.id, prefix: 'NHP', wardenName: 'Ravi' },
    { name: 'NextHome Oasis', type: AccommodationType.WOMENS, locId: locKoramangala.id, prefix: 'NHO', wardenName: 'Priya' },
    { name: 'NextHome Central', type: AccommodationType.MENS, locId: locHSR.id, prefix: 'NHC', wardenName: 'Amit' },
    { name: 'NextHome Serenity', type: AccommodationType.WOMENS, locId: locHSR.id, prefix: 'NHS', wardenName: 'Anjali' },
    { name: 'NextHome Elite', type: AccommodationType.MENS, locId: locIndiranagar.id, prefix: 'NHE', wardenName: 'Vikram' },
  ];

  const tenantNames = [
    "Rahul Sharma", "Sneha Patel", "Aditya Verma", "Kavya Singh", "Rohit Das",
    "Neha Gupta", "Arjun Nair", "Pooja Desai", "Siddharth Rao", "Meera Reddy",
    "Karan Malhotra", "Riya Kapoor", "Vikash Yadav", "Aarti Joshi", "Manish Tiwari",
    "Tanvi Bhatia", "Sameer Ahluwalia", "Ananya Menon", "Rishi Agarwal", "Simran Kaur",
    "Gaurav Chawla", "Divya Pillai", "Nitin Sethi", "Isha Chopra", "Akash Jain",
    "Kritika Mehra", "Varun Chauhan", "Shruti Iyer", "Pranav Kulkarni", "Nandini Rathi",
    "Yash Khurana", "Tanya Bansal", "Harsh Vardhan", "Priyanka Soni", "Ayush Mittal",
    "Snehal Kadam", "Abhinav Saxena", "Rachna Prasad", "Kartik Shenoy", "Sonal Dixit",
    "Uday Kiran", "Bhavna Mishra", "Vishal Thakur", "Jyoti Dubey", "Tariq Khan",
    "Aisha Sheikh", "Imran Ali", "Zara Qureshi", "Faizan Ahmed", "Sana Syed"
  ];

  let tenantCounter = 0;

  for (let h = 0; h < hostelsInfo.length; h++) {
    const info = hostelsInfo[h];
    console.log(`\nCreating Hostel ${h+1}/5: ${info.name}...`);
    
    const hostel = await prisma.hostel.create({
      data: {
        name: info.name,
        address: `Block ${h + 1}, ${info.name} Building`,
        accommodationType: info.type,
        locationId: info.locId,
        organizationId: org.id,
      },
    });

    // Warden
    const wardenEmail = `warden.${info.prefix.toLowerCase()}@nexthome.io`;
    const wardenAuthId = await createAuthUser(wardenEmail, commonPassword);
    
    const wardenUser = await prisma.user.create({
      data: {
        supabaseAuthId: wardenAuthId,
        email: wardenEmail,
        phone: `888888888${h}`,
        role: UserRole.WARDEN,
        passwordSetAt: new Date(),
        organizationId: org.id,
        warden: {
          create: {
            hostelId: hostel.id,
          }
        }
      },
      include: { warden: true }
    });

    // Structure (2 Floors, 5 Rooms each, 2 beds per room -> 20 beds)
    const availableBeds = [];
    for (let f = 1; f <= 2; f++) {
      const floor = await prisma.floor.create({
        data: { hostelId: hostel.id, name: `Floor ${f}`, sortOrder: f }
      });

      for (let r = 1; r <= 5; r++) {
        const room = await prisma.room.create({
          data: { floorId: floor.id, roomNumber: `${f}0${r}`, sharingType: SharingType.DOUBLE }
        });

        const bedA = await prisma.bed.create({ data: { roomId: room.id, label: `${f}0${r}-A`, status: BedStatus.AVAILABLE } });
        const bedB = await prisma.bed.create({ data: { roomId: room.id, label: `${f}0${r}-B`, status: BedStatus.AVAILABLE } });
        availableBeds.push(bedA, bedB);
      }
    }

    // Payment config
    await prisma.hostelPaymentConfig.create({
      data: {
        hostelId: hostel.id,
        upiId: `nexthome${info.prefix.toLowerCase()}@hdfc`,
      }
    });

    // Tenants (10 per hostel)
    for (let t = 0; t < 10; t++) {
      const tenantIdx = tenantCounter++;
      const tEmail = `tenant${tenantIdx + 1}@nexthome.io`;
      const tName = tenantNames[tenantIdx];
      const bed = availableBeds[t];

      process.stdout.write(`\r  Creating Tenant ${t+1}/10: ${tName} (${tEmail})...`);
      
      const tAuthId = await createAuthUser(tEmail, commonPassword);
      
      const tUser = await prisma.user.create({
        data: {
          supabaseAuthId: tAuthId,
          email: tEmail,
          phone: `9${String(tenantIdx + 1).padStart(9, '0')}`,
          role: UserRole.TENANT,
          passwordSetAt: new Date(),
          organizationId: org.id,
        }
      });

      const tenant = await prisma.tenant.create({
        data: {
          userId: tUser.id,
          fullName: tName,
          gender: info.type === AccommodationType.MENS ? 'MALE' : 'FEMALE',
          dateOfBirth: new Date(1995 + (tenantIdx % 5), (tenantIdx % 12), 15),
          permanentAddress: 'Bangalore, India',
          emergencyContactNumber: `9${String(tenantIdx + 1).padStart(9, '1')}`,
        }
      });

      // Mark bed occupied
      await prisma.bed.update({
        where: { id: bed.id },
        data: { status: BedStatus.OCCUPIED }
      });

      // Rent config mix
      const rentAmt = 1200000 + ((tenantIdx % 4) * 200000); // ₹12k to ₹18k
      
      // Active Stay
      const stay = await prisma.stay.create({
        data: {
          tenantId: tenant.id,
          bedId: bed.id,
          hostelId: hostel.id,
          status: StayStatus.ACTIVE,
          durationType: DurationType.MONTHLY,
          joiningDate: new Date(new Date().setDate(new Date().getDate() - (10 + (tenantIdx % 30)))), // joined 10-40 days ago
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
          isNewAdmission: true,
          admissionFeePaise: 100000, // ₹1k
          monthlyRentPaise: rentAmt, 
          securityDepositPaise: rentAmt * 2,
          foodChargesPaise: 0,
          discountPaise: 0,
          totalPayablePaise: rentAmt * 3 + 100000,
          foodPlan: (tenantIdx % 3 === 0) ? FoodPlan.BLD : ((tenantIdx % 2 === 0) ? FoodPlan.BREAKFAST_DINNER : FoodPlan.NOT_INCLUDED),
          foodBillingMode: (tenantIdx % 2 === 0) ? FoodBillingMode.FLAT_RATE : FoodBillingMode.POSTPAID,
        }
      });

      // Payments
      await prisma.payment.create({
        data: {
          stayId: stay.id,
          amountPaidPaise: rentAmt * 3 + 100000,
          paymentMode: 'UPI',
          paymentStatus: 'PAID',
          verifiedByUserId: admin.id,
          verifiedAt: new Date(),
        }
      });

      // Food Billing Cycles
      const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

      const tCycle = await prisma.foodBillingCycle.create({
        data: {
          stayId: stay.id,
          cycleStart: currentMonthStart,
          cycleEnd: currentMonthEnd,
          status: "OPEN",
          breakfastPricePaise: 5000,
          lunchPricePaise: 8000,
          dinnerPricePaise: 8000,
          totalConsumedPaise: (tenantIdx % 5) * 13000, // some arbitrary consumption
          totalPaidPaise: (tenantIdx % 2 === 0) ? 300000 : 0, // ₹3000 wallet for even tenants
        }
      });

      if (tCycle.totalPaidPaise && tCycle.totalPaidPaise > 0) {
        await prisma.foodWalletTopUp.create({
          data: {
            stayId: stay.id,
            cycleId: tCycle.id,
            amountPaise: tCycle.totalPaidPaise,
            status: TopUpStatus.APPROVED,
            approvedByUserId: admin.id,
          }
        });
      }

      // Random Tickets (1 in 5 tenants creates a ticket)
      if (tenantIdx % 5 === 0) {
        const ticket = await prisma.ticket.create({
          data: {
            tenantId: tenant.id,
            hostelId: hostel.id,
            title: `Issue with AC in Room ${bed.label.split('-')[0]}`,
            description: `The AC is not cooling properly since yesterday. Please fix it.`,
            priority: 'HIGH',
            status: 'OPEN',
            category: 'MAINTENANCE',
          }
        });

        // Add a comment
        await prisma.ticketComment.create({
          data: {
            ticketId: ticket.id,
            userId: tenant.userId!,
            message: 'It is very hot, please arrange a technician ASAP.',
          }
        });
      }
    }
    console.log(); // newline after tenants

    // Tasks for Warden
    await prisma.task.create({
      data: {
        organizationId: org.id,
        createdByUserId: admin.id,
        assignedToWardenId: wardenUser.warden!.id,
        hostelId: hostel.id,
        title: 'Collect pending electricity bills',
        description: 'Please collect the bills from the ground floor tenants.',
        priority: 'MEDIUM',
        status: 'PENDING',
        deadline: new Date(new Date().setDate(new Date().getDate() + 2)), 
      }
    });

    // Activity Log
    await prisma.activityLog.create({
      data: {
        organizationId: org.id,
        hostelId: hostel.id,
        eventType: 'TENANT_PAYMENT_RECEIVED',
        actorId: admin.id,
        actorName: 'Admin',
        subjectName: `Monthly Batch Rent`,
        subjectType: 'Payment',
      }
    });
  }

  console.log('\n=============================================');
  console.log('✅ DATABASE SEEDING COMPLETE! 🎉');
  console.log('=============================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
