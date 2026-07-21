import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
let prismaInstance: PrismaClient;

export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    if (!prismaInstance) {
      if (globalForPrisma.prisma) {
        prismaInstance = globalForPrisma.prisma;
      } else {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
          // Fallback during static build phase when env is not loaded in the build worker
          prismaInstance = new PrismaClient({
            log: ["error"],
          });
        } else {
          // IMPORTANT: When using the @prisma/adapter-pg driver adapter, SSL MUST be configured
          // via the Node.js `ssl` Pool option — NOT via `sslmode=` in the connection URL string.
          // Having both causes a conflict where sslmode=require overrides rejectUnauthorized:false,
          // resulting in a P1011 "self-signed certificate" error on tunneled AWS RDS connections.
          
          // Strip any sslmode param from the URL to prevent conflicts with the Node.js ssl option below
          const cleanConnectionString = connectionString.replace(/[?&]sslmode=[^&]*/g, "");
          
          // Detect if we're talking to a remote host (even if via a localhost tunnel to AWS RDS)
          // We use a special env flag so we can explicitly say "this localhost IS a remote tunnel"
          const isTunnelToRemote = process.env.DB_IS_TUNNEL === "true";
          const isLocalDev = (connectionString.includes("localhost") || connectionString.includes("127.0.0.1")) && !isTunnelToRemote;
          
          const pool = new Pool({
            connectionString: cleanConnectionString,
            // Use SSL for all remote connections (including SSM tunnels to AWS RDS)
            ssl: isLocalDev ? false : { rejectUnauthorized: false },
          });
          const adapter = new PrismaPg(pool);
          prismaInstance = new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
          });
          if (process.env.NODE_ENV !== "production") {
            globalForPrisma.prisma = prismaInstance;
          }
        }
      }
    }
    return Reflect.get(prismaInstance, prop, receiver);
  },
});
