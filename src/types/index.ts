/**
 * Domain types for Reigna.
 *
 * These mirror /prisma/schema.prisma. Kept as plain TypeScript (rather than
 * importing @prisma/client) so the UI and mock services have zero runtime
 * dependency on a live database connection during early development.
 * See /docs/API_INTEGRATION.md for how this maps to the real data layer.
 */

export type VerificationStatus = "UNVERIFIED" | "VERIFIED" | "RISKY" | "INVALID";

export type ContactSource = "DISCOVERY" | "MANUAL" | "IMPORT";

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED";

export type MessageStatus =
  | "DRAFTED"
  | "NEEDS_REVIEW"
  | "APPROVED"
  | "QUEUED"
  | "SENT"
  | "FOLLOWED_UP"
  | "REJECTED"
  | "FAILED";

export type MessageVariant = "INITIAL" | "FOLLOW_UP";

export type WarmupStatus = "WARMING" | "READY" | "PAUSED";

export type EventType =
  | "SENT"
  | "DELIVERED"
  | "OPENED"
  | "CLICKED"
  | "REPLIED"
  | "BOUNCED"
  | "UNSUBSCRIBED"
  | "COMPLAINED"
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "OUT_OF_OFFICE"
  | "AUTO_REPLIED"
  | "WRONG_PERSON";

export type SuppressionReason = "UNSUBSCRIBED" | "BOUNCED" | "COMPLAINED" | "MANUAL";

export type MailboxProvider = "GOOGLE" | "MICROSOFT";

export type ProviderAccountStatus = "PENDING" | "CONNECTED" | "FAILED";

export type ResearchRunStatus = "PENDING" | "COMPLETED" | "FAILED";

export type ReplyClassification = "INTERESTED" | "NOT_INTERESTED" | "OUT_OF_OFFICE" | "AUTO_REPLY";

export interface ResearchSignal {
  label: string;
  detail: string;
  source: string;
}

export interface Contact {
  id: string;
  company: string;
  companyDomain?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyCategory?: string;
  name: string;
  title: string;
  email: string;
  verificationStatus: VerificationStatus;
  verifiedAt?: string;
  emailConfidence?: number;
  decisionMakerScore?: number;
  source: ContactSource;
  sourceUrl?: string;
  engagementScore: number; // 0-100
  researchSummary?: string;
  researchSignals?: ResearchSignal[];
  whyThisPerson?: string;
  recommendation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  campaignId: string;
  contactId: string;
  variant: MessageVariant;
  subject: string;
  subjectVariants?: string[];
  body: string;
  researchBasis?: string;
  status: MessageStatus;
  replyClassification?: ReplyClassification;
  sentAt?: string;
  createdAt: string;
}

export interface CampaignStats {
  contacts: number;
  approved: number;
  queued: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
  followUpsSent: number;
}

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  senderIdentityId: string;
  followUpEnabled: boolean;
  followUpDelayDays: number;
  createdAt: string;
  stats: CampaignStats;
}

export interface SenderIdentity {
  id: string;
  provider?: MailboxProvider;
  domain: string;
  mailbox: string;
  firstName?: string;
  lastName?: string;
  voiceGuidance?: string;
  dailyCap: number;
  sentToday: number;
  warmupStatus: WarmupStatus;
  warmupScore?: number;
  spfValid: boolean;
  dkimValid: boolean;
  dmarcValid: boolean;
  bounceRate: number;
  complaintRate: number;
  providerStatus?: string;
  providerStatusMessage?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
  lastDnsCheckedAt?: string;
}

export interface EventRecord {
  id: string;
  messageId: string;
  contactId: string;
  campaignId: string;
  type: EventType;
  occurredAt: string;
}

export interface SuppressionEntry {
  id: string;
  email: string;
  reason: SuppressionReason;
  addedAt: string;
}

export interface DiscoveryResult {
  id: string;
  company: string;
  companyDomain: string;
  companyAddress?: string;
  companyPhone?: string;
  companyCategory?: string;
  decisionMaker: string;
  title: string;
  email: string;
  confidence: number; // 0-100
  verificationStatus: VerificationStatus;
  signal: string;
  source: string;
  alreadySaved?: boolean;
}

export interface ResearchSource {
  id: string;
  url: string;
  title?: string;
  snippet?: string;
  sourceType?: string;
  publishedAt?: string;
}

export interface ResearchRun {
  id: string;
  contactId: string;
  status: ResearchRunStatus;
  summary?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
  sources: ResearchSource[];
}

/** A single action item surfaced on the Command Center's "Talk to Today" list. */
export interface TalkToTodayItem {
  contact: Contact;
  reason: string;
  latestSignal: string;
  recommendedAction: string;
  priority: "high" | "medium" | "low";
}
