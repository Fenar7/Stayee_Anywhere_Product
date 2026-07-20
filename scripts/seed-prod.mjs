import pg from 'pg';
import { randomUUID } from 'crypto';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Helper to delay execution to avoid Cognito rate limits
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Cleaning up existing data...');
    // Wipe everything in reverse dependency order to avoid Postgres FK violations
    const tables = [
      'ActivityLog', 'FoodSettlementStatement', 'ComplementaryFoodOrder', 'FoodWalletTopUp', 'FoodBillingCycle',
      'TicketComment', 'Ticket', 'ServiceRequest', 'Notification', 'TaskComment', 'Task',
      'StayStatusEvent', 'FoodOrder', 'Payment', 'RefundInvoice', 'Document', 'Stay',
      'OnboardingRequest', 'LeadNote', 'Lead', 'Bed', 'Room', 'Flat', 'Floor',
      'Warden', 'Tenant', 'HostelPaymentConfig', 'FoodPricing', 'Hostel', 'User',
      'Location', 'Organization'
    ];
    for (const table of tables) {
      await client.query(`DELETE FROM "${table}"`);
    }

    console.log('No data found. Seeding production database with Cognito & Postgres...');

    // 1. Setup Cognito Client
    const issuer = process.env.COGNITO_ISSUER;
    if (!issuer) throw new Error("COGNITO_ISSUER env var is missing.");
    
    // Issuer is typically: https://cognito-idp.<region>.amazonaws.com/<user_pool_id>
    const match = issuer.match(/cognito-idp\.([a-z0-9-]+)\.amazonaws\.com\/(.+)/);
    if (!match) throw new Error("Invalid COGNITO_ISSUER format.");
    const region = match[1];
    const userPoolId = match[2];

    console.log(`Using Cognito Region: ${region}, UserPoolId: ${userPoolId}`);
    const cognitoClient = new CognitoIdentityProviderClient({ region });

    // Helper to create Cognito User and return 'sub' UUID
    async function createCognitoUser(email, password) {
      await delay(250); // prevent rate limit
      try {
        const createRes = await cognitoClient.send(new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: email,
          UserAttributes: [{ Name: 'email', Value: email }, { Name: 'email_verified', Value: 'true' }],
          MessageAction: 'SUPPRESS' // Don't send emails
        }));

        const sub = createRes.User.Attributes.find(a => a.Name === 'sub').Value;

        await cognitoClient.send(new AdminSetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: email,
          Password: password,
          Permanent: true
        }));

        return sub;
      } catch (e) {
        if (e.name === 'UsernameExistsException') {
          console.warn(`User ${email} already exists in Cognito. Fetching existing SUB...`);
          try {
            const getRes = await cognitoClient.send(new AdminGetUserCommand({
              UserPoolId: userPoolId,
              Username: email
            }));
            const existingSub = getRes.UserAttributes.find(a => a.Name === 'sub').Value;
            
            // Ensure password is set for existing users so we can definitely log in
            await cognitoClient.send(new AdminSetUserPasswordCommand({
              UserPoolId: userPoolId,
              Username: email,
              Password: password,
              Permanent: true
            }));
            
            return existingSub;
          } catch (fetchErr) {
            console.error(`Failed to fetch existing Cognito user ${email}:`, fetchErr);
            throw fetchErr;
          }
        }
        throw e;
      }
    }

    // Begin DB Inserts
    const orgId = randomUUID();
    await client.query(`INSERT INTO "Organization" (id, name, domain, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())`, [orgId, 'Next Home', 'nexthome.io']);

    // Locations
    const locKoramangala = randomUUID();
    const locHSR = randomUUID();
    const locIndiranagar = randomUUID();
    await client.query(`INSERT INTO "Location" (id, name, "createdAt") VALUES ($1, $2, NOW())`, [locKoramangala, 'Koramangala']);
    await client.query(`INSERT INTO "Location" (id, name, "createdAt") VALUES ($1, $2, NOW())`, [locHSR, 'HSR Layout']);
    await client.query(`INSERT INTO "Location" (id, name, "createdAt") VALUES ($1, $2, NOW())`, [locIndiranagar, 'Indiranagar']);

    // Global Admin
    const adminEmail = 'admin@nexthome.io';
    const commonPassword = 'Password@123';
    console.log(`Creating Admin: ${adminEmail} in Cognito...`);
    const adminSub = await createCognitoUser(adminEmail, commonPassword);
    const adminId = randomUUID();
    await client.query(
      `INSERT INTO "User" (id, "supabaseAuthId", phone, email, role, "passwordSetAt", "createdAt", "updatedAt", "organizationId") VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW(), $6)`,
      [adminId, adminSub, '9999999990', adminEmail, 'MAIN_ADMIN', orgId]
    );

    // Food Pricing
    await client.query(
      `INSERT INTO "FoodPricing" (id, "organizationId", "breakfastPricePaise", "lunchPricePaise", "dinnerPricePaise", "effectiveFrom", "createdAt", "createdByUserId") VALUES ($1, $2, 5000, 8000, 8000, '2024-01-01', NOW(), $3)`,
      [randomUUID(), orgId, adminId]
    );

    // Hostels Data
    const hostelsInfo = [
      { name: 'NextHome Paradise', type: 'MENS', locId: locKoramangala, prefix: 'NHP', wardenName: 'Ravi' },
      { name: 'NextHome Oasis', type: 'WOMENS', locId: locKoramangala, prefix: 'NHO', wardenName: 'Priya' },
      { name: 'NextHome Central', type: 'MENS', locId: locHSR, prefix: 'NHC', wardenName: 'Amit' },
      { name: 'NextHome Serenity', type: 'WOMENS', locId: locHSR, prefix: 'NHS', wardenName: 'Anjali' },
      { name: 'NextHome Elite', type: 'MENS', locId: locIndiranagar, prefix: 'NHE', wardenName: 'Vikram' },
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
      
      const hostelId = randomUUID();
      await client.query(
        `INSERT INTO "Hostel" (id, name, address, "accommodationType", "locationId", "organizationId", "createdAt", "updatedAt", "foodOrderCutoffStartHour", "foodOrderCutoffEndHour") VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), 20, 6)`,
        [hostelId, info.name, `Block ${h + 1}, ${info.name} Building`, info.type, info.locId, orgId]
      );

      // Warden
      const wardenEmail = `warden.${info.prefix.toLowerCase()}@nexthome.io`;
      console.log(`  Creating Warden in Cognito: ${wardenEmail}...`);
      const wardenSub = await createCognitoUser(wardenEmail, commonPassword);
      const wardenUserId = randomUUID();
      const wardenId = randomUUID();
      
      await client.query(
        `INSERT INTO "User" (id, "supabaseAuthId", phone, email, role, "passwordSetAt", "createdAt", "updatedAt", "organizationId") VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW(), $6)`,
        [wardenUserId, wardenSub, `888888888${h}`, wardenEmail, 'WARDEN', orgId]
      );
      await client.query(
        `INSERT INTO "Warden" (id, "userId", "hostelId", "createdAt") VALUES ($1, $2, $3, NOW())`,
        [wardenId, wardenUserId, hostelId]
      );

      // Structure
      const availableBeds = [];
      for (let f = 1; f <= 2; f++) {
        const floorId = randomUUID();
        await client.query(
          `INSERT INTO "Floor" (id, "hostelId", name, "sortOrder") VALUES ($1, $2, $3, $4)`,
          [floorId, hostelId, `Floor ${f}`, f]
        );

        for (let r = 1; r <= 5; r++) {
          const roomId = randomUUID();
          await client.query(
            `INSERT INTO "Room" (id, "floorId", "roomNumber", "sharingType", "isPrivate") VALUES ($1, $2, $3, 'DOUBLE', false)`,
            [roomId, floorId, `${f}0${r}`]
          );

          const bedAId = randomUUID();
          const bedBId = randomUUID();
          await client.query(`INSERT INTO "Bed" (id, "roomId", label, status) VALUES ($1, $2, $3, 'AVAILABLE')`, [bedAId, roomId, `${f}0${r}-A`]);
          await client.query(`INSERT INTO "Bed" (id, "roomId", label, status) VALUES ($1, $2, $3, 'AVAILABLE')`, [bedBId, roomId, `${f}0${r}-B`]);
          availableBeds.push({ id: bedAId, label: `${f}0${r}-A` }, { id: bedBId, label: `${f}0${r}-B` });
        }
      }

      await client.query(
        `INSERT INTO "HostelPaymentConfig" (id, "hostelId", "upiId", "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())`,
        [randomUUID(), hostelId, `nexthome${info.prefix.toLowerCase()}@hdfc`]
      );

      // Tenants (10 per hostel)
      for (let t = 0; t < 10; t++) {
        const tenantIdx = tenantCounter++;
        const tEmail = `tenant${tenantIdx + 1}@nexthome.io`;
        const tName = tenantNames[tenantIdx];
        const bed = availableBeds[t];
        const phone = `9${String(tenantIdx + 1).padStart(9, '0')}`;

        process.stdout.write(`\r    Creating Tenant ${t+1}/10: ${tName} (${tEmail})...`);
        const tSub = await createCognitoUser(tEmail, commonPassword);
        
        const tUserId = randomUUID();
        await client.query(
          `INSERT INTO "User" (id, "supabaseAuthId", phone, email, role, "passwordSetAt", "createdAt", "updatedAt", "organizationId") VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW(), $6)`,
          [tUserId, tSub, phone, tEmail, 'TENANT', orgId]
        );

        const tenantId = randomUUID();
        await client.query(
          `INSERT INTO "Tenant" (id, "userId", "fullName", gender, "dateOfBirth", "permanentAddress", "emergencyContactNumber", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [tenantId, tUserId, tName, info.type === 'MENS' ? 'MALE' : 'FEMALE', '1998-01-01', 'Bangalore, India', `9${String(tenantIdx + 1).padStart(9, '1')}`]
        );

        await client.query(`UPDATE "Bed" SET status = 'OCCUPIED' WHERE id = $1`, [bed.id]);

        const rentAmt = 1200000 + ((tenantIdx % 4) * 200000); 
        const totalPayable = rentAmt * 3 + 100000;
        const foodPlan = (tenantIdx % 3 === 0) ? 'BLD' : ((tenantIdx % 2 === 0) ? 'BREAKFAST_DINNER' : 'NOT_INCLUDED');
        const foodBillingMode = (tenantIdx % 2 === 0) ? 'FLAT_RATE' : 'POSTPAID';

        const stayId = randomUUID();
        await client.query(
          `INSERT INTO "Stay" (id, "tenantId", "bedId", "hostelId", status, "durationType", "joiningDate", "endDate", "isNewAdmission", "admissionFeePaise", "monthlyRentPaise", "securityDepositPaise", "foodChargesPaise", "discountPaise", "totalPayablePaise", "foodPlan", "foodBillingMode", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, 'ACTIVE', 'MONTHLY', NOW() - INTERVAL '30 days', NOW() + INTERVAL '150 days', true, 100000, $5, $6, 0, 0, $7, $8, $9, NOW(), NOW())`,
          [stayId, tenantId, bed.id, hostelId, rentAmt, rentAmt * 2, totalPayable, foodPlan, foodBillingMode]
        );

        await client.query(
          `INSERT INTO "Payment" (id, "stayId", "amountPaidPaise", "paymentMode", "paymentStatus", "verifiedByUserId", "verifiedAt", "createdAt", "updatedAt") VALUES ($1, $2, $3, 'UPI', 'PAID', $4, NOW(), NOW(), NOW())`,
          [randomUUID(), stayId, totalPayable, adminId]
        );

        const cycleId = randomUUID();
        const totalConsumed = (tenantIdx % 5) * 13000;
        const totalPaid = (tenantIdx % 2 === 0) ? 300000 : 0;
        await client.query(
          `INSERT INTO "FoodBillingCycle" (id, "stayId", "cycleStart", "cycleEnd", status, "breakfastPricePaise", "lunchPricePaise", "dinnerPricePaise", "totalConsumedPaise", "totalPaidPaise", "createdAt") 
           VALUES ($1, $2, date_trunc('month', NOW()), date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second', 'OPEN', 5000, 8000, 8000, $3, $4, NOW())`,
          [cycleId, stayId, totalConsumed, totalPaid]
        );

        if (totalPaid > 0) {
          await client.query(
            `INSERT INTO "FoodWalletTopUp" (id, "stayId", "cycleId", "amountPaise", status, "approvedByUserId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, 'APPROVED', $5, NOW(), NOW())`,
            [randomUUID(), stayId, cycleId, totalPaid, adminId]
          );
        }

        if (tenantIdx % 5 === 0) {
          const ticketId = randomUUID();
          await client.query(
            `INSERT INTO "Ticket" (id, "tenantId", "hostelId", title, description, priority, status, category, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, 'HIGH', 'OPEN', 'MAINTENANCE', NOW(), NOW())`,
            [ticketId, tenantId, hostelId, `Issue with AC in Room ${bed.label.split('-')[0]}`, `The AC is not cooling properly since yesterday.`]
          );
          await client.query(
            `INSERT INTO "TicketComment" (id, "ticketId", "userId", message, "isInternal", "createdAt") VALUES ($1, $2, $3, $4, false, NOW())`,
            [randomUUID(), ticketId, tUserId, 'It is very hot, please arrange a technician ASAP.']
          );
        }
      }
      console.log(); // newline

      // Task for Warden
      await client.query(
        `INSERT INTO "Task" (id, "organizationId", "createdByUserId", "assignedToWardenId", "hostelId", title, description, priority, status, deadline, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, 'MEDIUM', 'PENDING', NOW() + INTERVAL '2 days', NOW(), NOW())`,
        [randomUUID(), orgId, adminId, wardenId, hostelId, 'Collect pending electricity bills', 'Please collect the bills from the ground floor tenants.']
      );

      // Activity Log
      await client.query(
        `INSERT INTO "ActivityLog" (id, "organizationId", "hostelId", "eventType", "actorId", "actorName", "subjectName", "subjectType", "createdAt") VALUES ($1, $2, $3, 'TENANT_PAYMENT_RECEIVED', $4, 'Admin', 'Monthly Batch Rent', 'Payment', NOW())`,
        [randomUUID(), orgId, hostelId, adminId]
      );
    }

    console.log('\n============================================');
    console.log('🎉 PRODUCTION SEED COMPLETE!');
    console.log('============================================');
    console.log('Login URL:   https://dxmbzvslu88f1.cloudfront.net/admin-login');
    console.log('Email:       admin@nexthome.io');
    console.log('Password:    Password@123');
    console.log('============================================\n');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
