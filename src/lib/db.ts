import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton.
 *
 * Reigna uses Supabase PostgreSQL through Supabase's connection pooler.
 * Keep a single Prisma client during development so Turbopack/HMR does
 * not continuously create new database connections.
 */

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

export const prisma: PrismaClient | null = isDatabaseConfigured
  ? globalForPrisma.prisma ?? createPrismaClient()
  : null;

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}