// Production seed script - runs via Node.js directly (no TypeScript needed)
// Creates initial org + admin user ONLY if no data exists
import pg from 'pg';
import { randomUUID } from 'crypto';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // AWS RDS requires SSL; rejectUnauthorized:false accepts RDS self-signed certs
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Checking if seed data already exists...');

    const orgCheck = await client.query('SELECT id FROM "Organization" LIMIT 1');
    if (orgCheck.rows.length > 0) {
      console.log('✅ Organization already exists. Skipping seed.');
      return;
    }

    console.log('No data found. Seeding production database...');

    const orgId = randomUUID();
    const adminId = randomUUID();
    // supabaseAuthId is now just an internal identifier (not actually Supabase)
    const adminAuthId = randomUUID();

    // Create Organization
    await client.query(
      `INSERT INTO "Organization" (id, name, domain, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [orgId, 'Anywhere Node', 'anywhernode.com']
    );
    console.log('✅ Organization created:', orgId);

    // Create Admin User
    await client.query(
      `INSERT INTO "User" (id, "supabaseAuthId", phone, email, role, "passwordSetAt", "plainTextPassword", "createdAt", "updatedAt", "organizationId")
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW(), NOW(), $7)`,
      [adminId, adminAuthId, '9999999990', 'admin@nexthome.io', 'MAIN_ADMIN', 'Password@123', orgId]
    );
    console.log('✅ Admin user created.');

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
