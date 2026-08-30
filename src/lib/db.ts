import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton.
 *
 * `prisma` is `null` whenever DATABASE_URL isn't set — this is the expected
 * state for a fresh checkout with no database configured yet. Every service
 * must check `isDatabaseConfigured` before querying and report an explicit
 * "not connected" state rather than crashing or fabricating data.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

export const prisma: PrismaClient | null = isDatabaseConfigured
  ? globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    })
  : null;

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}
