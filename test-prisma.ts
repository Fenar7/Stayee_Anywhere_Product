import 'dotenv/config';
import { prisma } from './lib/db/index';
async function main() {
  try {
    const user = await prisma.user.findUnique({ where: { phone: "123" } });
    console.log("Success:", user);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}
main();
