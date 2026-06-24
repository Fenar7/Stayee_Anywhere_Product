import { prisma } from './lib/db';
async function main() {
  const users = await prisma.user.findMany();
  console.log('Users in DB:', users.length);
  console.log(users.map(u => u.email));
}
main().catch(console.error).finally(() => prisma.$disconnect());
