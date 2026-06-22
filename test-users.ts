import 'dotenv/config';
import { prisma } from './lib/db/index';
async function main() {
  const users = await prisma.user.findMany();
  console.log("Users in DB:", users);
  process.exit(0);
}
main();
