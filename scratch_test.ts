import { prisma } from './lib/db';

async function main() {
  try {
    const user = await prisma.user.findFirst({
      where: { role: 'TENANT' },
      include: { tenant: true }
    });
    console.log("User:", user?.email);
    
    if (user?.tenant) {
      const tickets = await prisma.ticket.findMany({
        where: { tenantId: user.tenant.id },
      });
      console.log("Tickets:", tickets.length);
    }
  } catch (e) {
    console.error("Prisma error:", e);
  } finally {
    process.exit(0);
  }
}
main();
