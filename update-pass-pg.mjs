import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:S3cr3tP@ssw0rd!@localhost:5432/staye_db',
  ssl: { rejectUnauthorized: false },
});
async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(`UPDATE "User" SET "plainTextPassword" = 'Password@123' WHERE "plainTextPassword" IS NULL;`);
    console.log('Updated users:', res.rowCount);
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);
