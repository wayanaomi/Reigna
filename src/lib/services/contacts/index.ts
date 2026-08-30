import type { Contact, ContactSource, VerificationStatus } from "@/types";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { toContact } from "@/lib/services/mappers";
import { emptyError, emptyUnconfigured, ok, type ServiceListResult } from "@/lib/services/types";

export interface CreateContactInput {
  company: string;
  companyDomain?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyCategory?: string;
  name: string;
  title?: string;
  email: string;
  source: ContactSource;
  sourceUrl?: string;
  decisionMakerScore?: number;
  emailConfidence?: number;
}

/**
 * Contacts (leads) service boundary. Real database only — no seed/demo
 * records. An empty list means either "not connected" (no DATABASE_URL) or
 * "connected, no leads yet" (a legitimate, expected first-run state).
 *
 * Every method is scoped to the authenticated owner (see
 * /docs/PRODUCT_DECISIONS.md — owner isolation): callers must always pass
 * the current session's ownerId.
 */
export interface ContactsService {
  list(ownerId: string): Promise<ServiceListResult<Contact>>;
  getById(ownerId: string, id: string): Promise<Contact | null>;
  findByEmail(ownerId: string, email: string): Promise<Contact | null>;
  create(ownerId: string, input: CreateContactInput): Promise<Contact>;
  updateVerification(
    ownerId: string,
    id: string,
    status: VerificationStatus,
    confidence?: number
  ): Promise<void>;
  updateResearch(
    ownerId: string,
    id: string,
    data: {
      researchSummary?: string;
      researchSignals?: unknown;
      whyThisPerson?: string;
      recommendation?: string;
    }
  ): Promise<void>;
}

class PrismaContactsService implements ContactsService {
  async list(ownerId: string): Promise<ServiceListResult<Contact>> {
    if (!isDatabaseConfigured || !prisma) return emptyUnconfigured();
    try {
      const rows = await prisma.contact.findMany({ where: { ownerId }, orderBy: { engagementScore: "desc" } });
      return ok(rows.map(toContact));
    } catch {
      return emptyError("Reigna couldn't reach the database.");
    }
  }

  async getById(ownerId: string, id: string): Promise<Contact | null> {
    if (!isDatabaseConfigured || !prisma) return null;
    try {
      const row = await prisma.contact.findFirst({ where: { id, ownerId } });
      return row ? toContact(row) : null;
    } catch {
      return null;
    }
  }

  async findByEmail(ownerId: string, email: string): Promise<Contact | null> {
    if (!isDatabaseConfigured || !prisma) return null;
    try {
      const row = await prisma.contact.findUnique({ where: { ownerId_email: { ownerId, email } } });
      return row ? toContact(row) : null;
    } catch {
      return null;
    }
  }

  async create(ownerId: string, input: CreateContactInput): Promise<Contact> {
    if (!isDatabaseConfigured || !prisma) throw new Error("Database is not connected.");
    const row = await prisma.contact.create({
      data: {
        ownerId,
        company: input.company,
        companyDomain: input.companyDomain,
        companyAddress: input.companyAddress,
        companyPhone: input.companyPhone,
        companyCategory: input.companyCategory,
        name: input.name,
        title: input.title,
        email: input.email,
        source: input.source,
        sourceUrl: input.sourceUrl,
        decisionMakerScore: input.decisionMakerScore,
        emailConfidence: input.emailConfidence,
      },
    });
    return toContact(row);
  }

  async updateVerification(
    ownerId: string,
    id: string,
    status: VerificationStatus,
    confidence?: number
  ): Promise<void> {
    if (!isDatabaseConfigured || !prisma) throw new Error("Database is not connected.");
    await prisma.contact.updateMany({
      where: { id, ownerId },
      data: { verificationStatus: status, verifiedAt: new Date(), emailConfidence: confidence },
    });
  }

  async updateResearch(
    ownerId: string,
    id: string,
    data: {
      researchSummary?: string;
      researchSignals?: unknown;
      whyThisPerson?: string;
      recommendation?: string;
    }
  ): Promise<void> {
    if (!isDatabaseConfigured || !prisma) throw new Error("Database is not connected.");
    await prisma.contact.updateMany({
      where: { id, ownerId },
      data: {
        researchSummary: data.researchSummary,
        researchSignals: data.researchSignals as never,
        whyThisPerson: data.whyThisPerson,
        recommendation: data.recommendation,
      },
    });
  }
}

export const contactsService: ContactsService = new PrismaContactsService();

