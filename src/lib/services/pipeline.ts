import { prisma, isDatabaseConfigured } from "@/lib/db";
import { contactsService } from "@/lib/services/contacts";
import { researchService } from "@/lib/services/research";
import { personalizationService } from "@/lib/services/personalization";

export interface GenerateDraftsResult {
  drafted: number;
  skipped: number;
  errors: string[];
}

/**
 * Generates first-touch drafts for every contact newly added to a
 * campaign: runs research first if the contact doesn't already have it,
 * then asks the personalization service to write a grounded draft using
 * the campaign's sender identity voice guidance. Every draft lands in
 * `NEEDS_REVIEW` — nothing here is ever auto-approved.
 */
export async function generateDraftsForCampaign(ownerId: string, campaignId: string): Promise<GenerateDraftsResult> {
  if (!isDatabaseConfigured || !prisma) return { drafted: 0, skipped: 0, errors: ["No database connection."] };

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, ownerId },
    include: { senderIdentity: true, contacts: { include: { contact: true } } },
  });
  if (!campaign) return { drafted: 0, skipped: 0, errors: ["Campaign not found."] };

  let drafted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const { contact } of campaign.contacts) {
    const existingMessage = await prisma.message.findFirst({ where: { campaignId, contactId: contact.id } });
    if (existingMessage) {
      skipped += 1;
      continue;
    }

    let researchSummary = contact.researchSummary;
    let researchSignals = contact.researchSignals as { label: string; detail: string; source: string }[] | null;

    if (!researchSummary || !researchSignals || researchSignals.length === 0) {
      const outcome = await researchService.researchContact(ownerId, contact.id);
      if (!outcome.configured || outcome.error || !outcome.summary || !outcome.signals) {
        skipped += 1;
        errors.push(`${contact.name}: ${outcome.error ?? "research is not configured."}`);
        continue;
      }
      researchSummary = outcome.summary;
      researchSignals = outcome.signals;
    }

    const draft = await personalizationService.generateDraft({
      contactName: contact.name,
      contactTitle: contact.title ?? "",
      company: contact.company,
      researchSummary,
      researchSignals,
      voiceGuidance: campaign.senderIdentity.voiceGuidance ?? undefined,
    });

    if (!draft.configured || draft.error || !draft.subject || !draft.body) {
      skipped += 1;
      errors.push(`${contact.name}: ${draft.error ?? "AI writing is not configured."}`);
      continue;
    }

    await prisma.message.create({
      data: {
        campaignId,
        contactId: contact.id,
        variant: "INITIAL",
        subject: draft.subject,
        subjectVariants: draft.subjectVariants,
        body: draft.body,
        researchBasis: draft.researchBasis,
        status: "NEEDS_REVIEW",
      },
    });
    drafted += 1;
  }

  return { drafted, skipped, errors };
}

/** Generates (or regenerates) the draft for one contact within one campaign. */
export async function generateDraftForContact(
  ownerId: string,
  campaignId: string,
  contactId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseConfigured || !prisma) return { ok: false, error: "No database connection." };

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, ownerId },
    include: { senderIdentity: true },
  });
  if (!campaign) return { ok: false, error: "Campaign not found." };

  const contact = await prisma.contact.findFirst({ where: { id: contactId, ownerId } });
  if (!contact) return { ok: false, error: "Contact not found." };

  let researchSummary = contact.researchSummary;
  let researchSignals = contact.researchSignals as { label: string; detail: string; source: string }[] | null;

  if (!researchSummary || !researchSignals || researchSignals.length === 0) {
    const outcome = await researchService.researchContact(ownerId, contact.id);
    if (!outcome.configured || outcome.error || !outcome.summary || !outcome.signals) {
      return { ok: false, error: outcome.error ?? "Research is not configured." };
    }
    researchSummary = outcome.summary;
    researchSignals = outcome.signals;
  }

  const draft = await personalizationService.generateDraft({
    contactName: contact.name,
    contactTitle: contact.title ?? "",
    company: contact.company,
    researchSummary,
    researchSignals,
    voiceGuidance: campaign.senderIdentity.voiceGuidance ?? undefined,
  });

  if (!draft.configured || draft.error || !draft.subject || !draft.body) {
    return { ok: false, error: draft.error ?? "AI writing is not configured." };
  }

  const existing = await prisma.message.findFirst({ where: { campaignId, contactId } });
  if (existing) {
    await prisma.message.update({
      where: { id: existing.id },
      data: {
        subject: draft.subject,
        subjectVariants: draft.subjectVariants,
        body: draft.body,
        researchBasis: draft.researchBasis,
        status: "NEEDS_REVIEW",
      },
    });
  } else {
    await prisma.message.create({
      data: {
        campaignId,
        contactId,
        variant: "INITIAL",
        subject: draft.subject,
        subjectVariants: draft.subjectVariants,
        body: draft.body,
        researchBasis: draft.researchBasis,
        status: "NEEDS_REVIEW",
      },
    });
  }

  return { ok: true };
}

/** Regenerates a single message's content (used by the review queue's "Regenerate" action). */
export async function regenerateMessage(ownerId: string, messageId: string): Promise<{ ok: boolean; error?: string }> {  if (!isDatabaseConfigured || !prisma) return { ok: false, error: "No database connection." };

  const message = await prisma.message.findFirst({
    where: { id: messageId, campaign: { ownerId } },
    include: { contact: true, campaign: { include: { senderIdentity: true } } },
  });
  if (!message) return { ok: false, error: "Message not found." };

  const contact = message.contact;
  let researchSummary = contact.researchSummary;
  let researchSignals = contact.researchSignals as { label: string; detail: string; source: string }[] | null;

  if (!researchSummary || !researchSignals || researchSignals.length === 0) {
    const outcome = await researchService.researchContact(ownerId, contact.id);
    if (!outcome.configured || outcome.error || !outcome.summary || !outcome.signals) {
      return { ok: false, error: outcome.error ?? "Research is not configured." };
    }
    researchSummary = outcome.summary;
    researchSignals = outcome.signals;
  }

  const draft = await personalizationService.generateDraft({
    contactName: contact.name,
    contactTitle: contact.title ?? "",
    company: contact.company,
    researchSummary,
    researchSignals,
    voiceGuidance: message.campaign.senderIdentity.voiceGuidance ?? undefined,
  });

  if (!draft.configured || draft.error || !draft.subject || !draft.body) {
    return { ok: false, error: draft.error ?? "AI writing is not configured." };
  }

  await prisma.message.update({
    where: { id: messageId },
    data: {
      subject: draft.subject,
      subjectVariants: draft.subjectVariants,
      body: draft.body,
      researchBasis: draft.researchBasis,
      status: "NEEDS_REVIEW",
    },
  });

  return { ok: true };
}

/** Adds a discovered candidate to Reigna: dedupes, verifies, and persists as a Contact. */
export async function addDiscoveryCandidateToReigna(
  ownerId: string,
  candidate: {
    company: string;
    companyDomain: string;
    companyAddress?: string;
    companyPhone?: string;
    companyCategory?: string;
    decisionMaker: string;
    title: string;
    email: string;
    confidence: number;
    source: string;
  }
): Promise<{ contactId: string; alreadyExisted: boolean } | { error: string }> {
  const existing = await contactsService.findByEmail(ownerId, candidate.email);
  if (existing) return { contactId: existing.id, alreadyExisted: true };

  const { verificationService } = await import("@/lib/services/verification");
  const verification = await verificationService.verifyEmail(candidate.email);

  const contact = await contactsService.create(ownerId, {
    company: candidate.company,
    companyDomain: candidate.companyDomain,
    companyAddress: candidate.companyAddress,
    companyPhone: candidate.companyPhone,
    companyCategory: candidate.companyCategory,
    name: candidate.decisionMaker,
    title: candidate.title,
    email: candidate.email,
    source: "DISCOVERY",
    sourceUrl: candidate.source,
    decisionMakerScore: candidate.confidence,
    emailConfidence: verification.confidence,
  });

  if (verification.status) {
    await contactsService.updateVerification(ownerId, contact.id, verification.status, verification.confidence);
  }

  return { contactId: contact.id, alreadyExisted: false };
}
