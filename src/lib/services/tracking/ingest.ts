import type { EventType } from "@/types";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { engagementService } from "@/lib/services/engagement";
import { classifyReply } from "@/lib/services/tracking/classify-reply";

/**
 * Instantly → Reigna webhook ingestion.
 *
 * Idempotency: every inbound event carries a provider-assigned id. We
 * insert into `WebhookEvent` (unique on provider+externalId) *before*
 * doing any other work; a unique-constraint violation means we've already
 * processed this event; we exit quietly rather than creating a duplicate
 * `Event` row.
 *
 * Payload shape: Instantly v2 webhook payloads are read defensively via a
 * small set of plausible key aliases, since the exact field names weren't
 * verifiable against live documentation while building this integration.
 * If Instantly's real payload differs, only `readPayload()` below needs to
 * change — the rest of the pipeline operates on the normalized shape.
 */

const EVENT_TYPE_MAP: Record<string, EventType | "ACCOUNT_ERROR" | "CAMPAIGN_COMPLETED" | undefined> = {
  email_sent: "SENT",
  email_opened: "OPENED",
  email_link_clicked: "CLICKED",
  reply_received: "REPLIED",
  auto_reply_received: "AUTO_REPLIED",
  email_bounced: "BOUNCED",
  lead_unsubscribed: "UNSUBSCRIBED",
  lead_interested: "INTERESTED",
  lead_not_interested: "NOT_INTERESTED",
  lead_out_of_office: "OUT_OF_OFFICE",
  lead_wrong_person: "WRONG_PERSON",
  account_error: "ACCOUNT_ERROR",
  campaign_completed: "CAMPAIGN_COMPLETED",
};

interface NormalizedPayload {
  externalId: string;
  eventType: string;
  campaignId: string | null;
  leadEmail: string | null;
  accountEmail: string | null;
  replyBody: string | null;
}

function readPayload(raw: Record<string, unknown>): NormalizedPayload {
  const str = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };

  return {
    externalId: str("id", "event_id", "webhook_id") ?? `${str("event_type", "type")}-${str("timestamp")}`,
    eventType: str("event_type", "type") ?? "unknown",
    campaignId: str("campaign_id", "campaign"),
    leadEmail: str("lead_email", "email", "to"),
    accountEmail: str("account_email", "from", "sender_email"),
    replyBody: str("reply_text", "message", "body", "text"),
  };
}

export type IngestResult = { status: "ok" | "duplicate" | "ignored"; reason?: string };

export async function ingestInstantlyWebhookEvent(raw: Record<string, unknown>): Promise<IngestResult> {
  if (!isDatabaseConfigured || !prisma) return { status: "ignored", reason: "Database is not connected." };

  const payload = readPayload(raw);
  const mapped = EVENT_TYPE_MAP[payload.eventType];
  if (!mapped) return { status: "ignored", reason: `Unrecognized event type: ${payload.eventType}` };

  try {
    await prisma.webhookEvent.create({
      data: { provider: "INSTANTLY", externalId: payload.externalId, eventType: payload.eventType },
    });
  } catch {
    // Unique constraint violation → already processed.
    return { status: "duplicate" };
  }

  if (mapped === "ACCOUNT_ERROR") {
    if (payload.accountEmail) {
      await prisma.senderIdentity.updateMany({
        where: { mailbox: payload.accountEmail },
        data: { providerStatus: "ERROR", providerStatusMessage: "Instantly reported an account error." },
      });
    }
    return { status: "ok" };
  }

  if (mapped === "CAMPAIGN_COMPLETED") {
    if (payload.campaignId) {
      const mapping = await prisma.campaignProviderMapping.findFirst({
        where: { providerCampaignId: payload.campaignId },
      });
      if (mapping) {
        await prisma.campaign.update({ where: { id: mapping.campaignId }, data: { status: "COMPLETED" } });
      }
    }
    return { status: "ok" };
  }

  if (!payload.campaignId || !payload.leadEmail) {
    return { status: "ignored", reason: "Missing campaign or lead identifier." };
  }

  const mapping = await prisma.campaignProviderMapping.findFirst({
    where: { providerCampaignId: payload.campaignId },
  });
  if (!mapping) return { status: "ignored", reason: "No local campaign mapped to this provider campaign." };

  const campaign = await prisma.campaign.findUnique({ where: { id: mapping.campaignId } });
  if (!campaign) return { status: "ignored", reason: "Local campaign no longer exists." };

  const contact = await prisma.contact.findUnique({
    where: { ownerId_email: { ownerId: campaign.ownerId, email: payload.leadEmail } },
  });
  if (!contact) return { status: "ignored", reason: "No local contact matches this lead email." };

  const message = await prisma.message.findFirst({
    where: { campaignId: campaign.id, contactId: contact.id },
    orderBy: { createdAt: "desc" },
  });
  if (!message) return { status: "ignored", reason: "No local message found for this campaign/contact." };

  const eventType = mapped as EventType;

  await prisma.event.create({ data: { messageId: message.id, type: eventType } });

  if (eventType === "SENT" && !message.sentAt) {
    await prisma.message.update({ where: { id: message.id }, data: { sentAt: new Date(), status: "SENT" } });
  }

  if (eventType === "BOUNCED") {
    await prisma.suppressionEntry.upsert({
      where: { ownerId_email: { ownerId: campaign.ownerId, email: contact.email } },
      create: { ownerId: campaign.ownerId, email: contact.email, reason: "BOUNCED" },
      update: { reason: "BOUNCED" },
    });
  }
  if (eventType === "UNSUBSCRIBED") {
    await prisma.suppressionEntry.upsert({
      where: { ownerId_email: { ownerId: campaign.ownerId, email: contact.email } },
      create: { ownerId: campaign.ownerId, email: contact.email, reason: "UNSUBSCRIBED" },
      update: { reason: "UNSUBSCRIBED" },
    });
  }

  if (eventType === "REPLIED" || eventType === "INTERESTED" || eventType === "NOT_INTERESTED") {
    const classification =
      eventType === "INTERESTED"
        ? "INTERESTED"
        : eventType === "NOT_INTERESTED"
          ? "NOT_INTERESTED"
          : await classifyReply(payload.replyBody);
    if (classification) {
      await prisma.message.update({ where: { id: message.id }, data: { replyClassification: classification } });
    }
  }
  if (eventType === "OUT_OF_OFFICE" || eventType === "WRONG_PERSON" || eventType === "AUTO_REPLIED") {
    const classification = eventType === "OUT_OF_OFFICE" ? "OUT_OF_OFFICE" : eventType === "AUTO_REPLIED" ? "AUTO_REPLY" : null;
    if (classification) {
      await prisma.message.update({ where: { id: message.id }, data: { replyClassification: classification } });
    }
  }

  await engagementService.recalculateScore(contact.id);

  return { status: "ok" };
}
