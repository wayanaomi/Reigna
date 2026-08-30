import type { SuppressionEntry, SuppressionReason } from "@/types";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { emptyError, emptyUnconfigured, ok, type ServiceListResult } from "@/lib/services/types";

/**
 * Suppression list service boundary — global do-not-contact registry,
 * scoped per owner. This list must be checked before any send (see
 * `isSuppressed`); nothing in Reigna bypasses it.
 */
export interface SuppressionService {
  list(ownerId: string): Promise<ServiceListResult<SuppressionEntry>>;
  isSuppressed(ownerId: string, email: string): Promise<boolean>;
  add(ownerId: string, email: string, reason: SuppressionReason): Promise<void>;
}

class PrismaSuppressionService implements SuppressionService {
  async list(ownerId: string): Promise<ServiceListResult<SuppressionEntry>> {
    if (!isDatabaseConfigured || !prisma) return emptyUnconfigured();
    try {
      const rows = await prisma.suppressionEntry.findMany({ where: { ownerId }, orderBy: { addedAt: "desc" } });
      return ok(
        rows.map((row) => ({
          id: row.id,
          email: row.email,
          reason: row.reason,
          addedAt: row.addedAt.toISOString(),
        }))
      );
    } catch {
      return emptyError("Reigna couldn't reach the database.");
    }
  }

  async isSuppressed(ownerId: string, email: string): Promise<boolean> {
    if (!isDatabaseConfigured || !prisma) return false;
    const row = await prisma.suppressionEntry.findUnique({
      where: { ownerId_email: { ownerId, email: email.toLowerCase() } },
    });
    return Boolean(row);
  }

  async add(ownerId: string, email: string, reason: SuppressionReason): Promise<void> {
    if (!isDatabaseConfigured || !prisma) throw new Error("Database is not connected.");
    await prisma.suppressionEntry.upsert({
      where: { ownerId_email: { ownerId, email: email.toLowerCase() } },
      create: { ownerId, email: email.toLowerCase(), reason },
      update: { reason },
    });
  }
}

export const suppressionService: SuppressionService = new PrismaSuppressionService();
