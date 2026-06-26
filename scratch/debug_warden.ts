import { prisma } from "../lib/db";

async function main() {
  const user = await prisma.user.findFirst({
    where: { phone: "9999999990" },
    include: {
      warden: true,
    }
  });
  console.log("User:", JSON.stringify(user, null, 2));
}

main().catch(console.error);
