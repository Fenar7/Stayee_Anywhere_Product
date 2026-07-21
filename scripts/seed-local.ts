import pg from 'pg';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Fetching users from DB...');
    const userResult = await client.query(`SELECT id, "supabaseAuthId", "organizationId", role FROM "User" WHERE role = 'MAIN_ADMIN' LIMIT 1`);
    
    if (userResult.rows.length === 0) {
      console.log('No MAIN_ADMIN found! Please ensure you have logged in at least once or run the production seed script.');
      return;
    }

    const admin = userResult.rows[0];
    const adminId = admin.id;
    let orgId = admin.organizationId;

    if (!orgId) {
      console.log('Admin has no organization, creating one...');
      orgId = randomUUID();
      await client.query(`INSERT INTO "Organization" (id, name, domain, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())`, [orgId, 'Local Org', 'local.org']);
      await client.query(`UPDATE "User" SET "organizationId" = $1 WHERE id = $2`, [orgId, adminId]);
    }

    console.log(`Using Organization ID: ${orgId}`);

    // Check if hostels already exist
    const hostelResult = await client.query(`SELECT COUNT(*) FROM "Hostel" WHERE "organizationId" = $1`, [orgId]);
    if (parseInt(hostelResult.rows[0].count) > 0) {
      console.log('Hostels already exist for this organization. Skipping seed to prevent duplication.');
      return;
    }

    console.log('Creating Locations...');
    const locKoramangala = randomUUID();
    const locHSR = randomUUID();
    await client.query(`INSERT INTO "Location" (id, name, "createdAt") VALUES ($1, $2, NOW())`, [locKoramangala, 'Local Area 1']);
    await client.query(`INSERT INTO "Location" (id, name, "createdAt") VALUES ($1, $2, NOW())`, [locHSR, 'Local Area 2']);

    console.log('Creating Hostels...');
    const hostelsInfo = [
      { name: 'Local Hostel Mens', type: 'MENS', locId: locKoramangala, prefix: 'LHM', wardenName: 'Warden 1' },
      { name: 'Local Hostel Womens', type: 'WOMENS', locId: locHSR, prefix: 'LHW', wardenName: 'Warden 2' },
    ];

    const hostels = [];
    for (const info of hostelsInfo) {
      const hId = randomUUID();
      await client.query(
        `INSERT INTO "Hostel" (id, "organizationId", "locationId", name, type, address, "contactNumber", "prefix", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [hId, orgId, info.locId, info.name, info.type, '123 Local Street', '9876543210', info.prefix]
      );
      hostels.push(hId);

      // Create dummy floors, rooms, beds
      const fId = randomUUID();
      await client.query(`INSERT INTO "Floor" (id, "hostelId", number, "createdAt", "updatedAt") VALUES ($1, $2, 1, NOW(), NOW())`, [fId, hId]);

      const rId = randomUUID();
      await client.query(
        `INSERT INTO "Room" (id, "floorId", number, capacity, type, "createdAt", "updatedAt") VALUES ($1, $2, '101', 2, 'DOUBLE', NOW(), NOW())`,
        [rId, fId]
      );

      const b1 = randomUUID();
      const b2 = randomUUID();
      await client.query(`INSERT INTO "Bed" (id, "roomId", identifier, "createdAt", "updatedAt") VALUES ($1, $2, 'A', NOW(), NOW())`, [b1, rId]);
      await client.query(`INSERT INTO "Bed" (id, "roomId", identifier, "createdAt", "updatedAt") VALUES ($1, $2, 'B', NOW(), NOW())`, [b2, rId]);
    }

    console.log('Seed complete! Local data populated successfully.');
  } catch (error) {
    console.error('Error seeding local database:', error);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
