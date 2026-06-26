import { prisma } from "../lib/db";
import { z } from "zod";
import { ServiceRequestType } from "@prisma/client";

async function main() {
  const stayId = "606c6f9a-64c8-4e93-80cf-6d61cfc9ce37";
  const stay = await prisma.stay.findUnique({
    where: { id: stayId },
    include: { tenant: true }
  });
  console.log("Stay:", JSON.stringify(stay, null, 2));
}

main().catch(console.error);
