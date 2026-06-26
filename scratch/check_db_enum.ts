import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not set");
    return;
  }
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'ServiceRequestType';
    `);
    console.log("Database Enum Values for ServiceRequestType:", res.rows.map(r => r.enumlabel));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
