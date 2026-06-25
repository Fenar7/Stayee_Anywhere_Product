import { prisma } from "../lib/db";

async function main() {
  console.log("Starting Multi-Tenant Migration...");

  // 1. Create the default NextHome Organization
  let nextHomeOrg = await prisma.organization.findUnique({
    where: { domain: "nexthome.in" },
  });

  if (!nextHomeOrg) {
    nextHomeOrg = await prisma.organization.create({
      data: {
        name: "NextHome",
        domain: "nexthome.in",
        brandColor: "#0F172A",
      },
    });
    console.log(`Created Organization: ${nextHomeOrg.name} (${nextHomeOrg.id})`);
  } else {
    console.log(`Organization already exists: ${nextHomeOrg.name} (${nextHomeOrg.id})`);
  }

  // 2. Assign all existing Hostels to NextHome
  const updatedHostels = await prisma.hostel.updateMany({
    where: { organizationId: "" },
    data: { organizationId: nextHomeOrg.id },
  });
  console.log(`Migrated ${updatedHostels.count} Hostels to Organization.`);

  // 3. Assign all existing Users to NextHome
  const updatedUsers = await prisma.user.updateMany({
    where: { organizationId: "" },
    data: { organizationId: nextHomeOrg.id },
  });
  console.log(`Migrated ${updatedUsers.count} Users to Organization.`);

  // 4. Assign all existing Leads to NextHome
  const updatedLeads = await prisma.lead.updateMany({
    where: { organizationId: "" },
    data: { organizationId: nextHomeOrg.id },
  });
  console.log(`Migrated ${updatedLeads.count} Leads to Organization.`);

  console.log("Migration completed successfully!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
