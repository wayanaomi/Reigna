import type {
  Contact as PrismaContact,
  Campaign as PrismaCampaign,
  Message as PrismaMessage,
  SenderIdentity as PrismaSenderIdentity,
} from "@prisma/client";
import type { Contact, Campaign, CampaignStats, Message, ResearchSignal, SenderIdentity } from "@/types";

/** Maps a Prisma Contact row to the app's plain Contact type. */
export function toContact(row: PrismaContact): Contact {
  return {
    id: row.id,
    company: row.company,
    companyDomain: row.companyDomain ?? undefined,
    companyAddress: row.companyAddress ?? undefined,
    companyPhone: row.companyPhone ?? undefined,
    companyCategory: row.companyCategory ?? undefined,
    name: row.name,
    title: row.title ?? "",
    email: row.email,
    verificationStatus: row.verificationStatus,
    verifiedAt: row.verifiedAt?.toISOString(),
    emailConfidence: row.emailConfidence ?? undefined,
    decisionMakerScore: row.decisionMakerScore ?? undefined,
    source: row.source,
    sourceUrl: row.sourceUrl ?? undefined,
    engagementScore: row.engagementScore,
    researchSummary: row.researchSummary ?? undefined,
    researchSignals: (row.researchSignals as unknown as ResearchSignal[] | null) ?? undefined,
    whyThisPerson: row.whyThisPerson ?? undefined,
    recommendation: row.recommendation ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Maps a Prisma Campaign row plus computed stats to the app's Campaign type. */
export function toCampaign(row: PrismaCampaign, stats: CampaignStats): Campaign {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    senderIdentityId: row.senderIdentityId,
    followUpEnabled: row.followUpEnabled,
    followUpDelayDays: row.followUpDelayDays,
    createdAt: row.createdAt.toISOString(),
    stats,
  };
}

/** Maps a Prisma Message row to the app's Message type. */
export function toMessage(row: PrismaMessage): Message {
  return {
    id: row.id,
    campaignId: row.campaignId,
    contactId: row.contactId,
    variant: row.variant,
    subject: row.subject,
    subjectVariants: (row.subjectVariants as unknown as string[] | null) ?? undefined,
    body: row.body,
    researchBasis: row.researchBasis ?? undefined,
    status: row.status,
    replyClassification: row.replyClassification ?? undefined,
    sentAt: row.sentAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Maps a Prisma SenderIdentity row to the app's plain SenderIdentity type. */
export function toSenderIdentity(row: PrismaSenderIdentity): SenderIdentity {
  return {
    id: row.id,
    provider: row.provider ?? undefined,
    domain: row.domain,
    mailbox: row.mailbox,
    firstName: row.firstName ?? undefined,
    lastName: row.lastName ?? undefined,
    voiceGuidance: row.voiceGuidance ?? undefined,
    dailyCap: row.dailyCap,
    sentToday: row.sentToday,
    warmupStatus: row.warmupStatus,
    warmupScore: row.warmupScore ?? undefined,
    spfValid: row.spfValid,
    dkimValid: row.dkimValid,
    dmarcValid: row.dmarcValid,
    bounceRate: row.bounceRate,
    complaintRate: row.complaintRate,
    providerStatus: row.providerStatus ?? undefined,
    providerStatusMessage: row.providerStatusMessage ?? undefined,
    connectedAt: row.connectedAt?.toISOString(),
    lastSyncedAt: row.lastSyncedAt?.toISOString(),
    lastDnsCheckedAt: row.lastDnsCheckedAt?.toISOString(),
  };
}

export function zeroCampaignStats(): CampaignStats {
  return {
    contacts: 0,
    approved: 0,
    queued: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
    bounced: 0,
    unsubscribed: 0,
    followUpsSent: 0,
  };
}

