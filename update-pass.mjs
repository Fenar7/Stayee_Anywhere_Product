import { PrismaClient } from '@prisma/client';
process.env.DATABASE_URL = 'postgresql://postgres:S3cr3tP@ssw0rd!@localhost:5432/staye_db';
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$executeRawUnsafe(`UPDATE "User" SET "plainTextPassword" = 'Password@123' WHERE "plainTextPassword" IS NULL;`);
  console.log('Updated users:', result);
}
main().catch(console.error).finally(() => prisma.$disconnect());