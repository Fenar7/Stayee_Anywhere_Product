import { prisma } from './lib/db'; async function run() { console.log(await prisma.user.findFirst({ where: { email: 'admin@nexthome.io' } })); } run().finally(() => process.exit(0));
