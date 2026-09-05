import { prisma, isDatabaseConfigured } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { instantlyProvider } from "@/lib/providers/instantly";
import { engagementService } from "@/lib/services/engagement";

export interface TrackingSyncResult {
  checked: number;
  updated: number;
  events: number;
  skipped: number;
  failed: number;
  errors: string[];
}

type ActivityType =
  | "SENT"
  | "OPENED"
  | "CLICKED"
  | "REPLIED"
  | "BOUNCED"
  | "UNSUBSCRIBED";

function parseDate(value: string | null | undefined): Date {
  if (!value) return new Date();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Creates a local event exactly once.
 *
 * WebhookEvent is used as the provider-event idempotency ledger for both
 * webhook and polling-based activity. This means repeated cron runs cannot
 * create duplicate Event rows.
 */
async function recordEventOnce(
  messageId: string,
  providerEventId: string,
  eventType: ActivityType,
  occurredAt: Date,
  metadata: Prisma.InputJsonValue
): Promise<boolean> {
  if (!prisma) return false;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.webhookEvent.create({
        data: {
          provider: "INSTANTLY_POLL",
          externalId: providerEventId,
          eventType,
        },
      });

      await tx.event.create({
        data: {
          messageId,
          type: eventType,
          occurredAt,
          metadata,
        },
      });
    });

    return true;
  } catch {
    return false;
  }
}

async function syncMessage(
  ownerId: string,
  providerCampaignId: string,
  message: {
    id: string;
    contactId: string;
    status: string;
    sentAt: Date | null;
    providerMessageId: string | null;
    contact: {
      email: string;
    };
  }
): Promise<{ updated: boolean; events: number }> {
  if (!prisma) return { updated: false, events: 0 };

  const lead = await instantlyProvider.getLeadByEmail(
    providerCampaignId,
    message.contact.email
  );

  if (!lead) {
    return { updated: false, events: 0 };
  }

  let updated = false;
  let events = 0;

  /*
   * Store Instantly's lead ID locally.
   *
   * This gives us a stable provider identifier for future diagnostics.
   */
  if (message.providerMessageId !== lead.id) {
    await prisma.message.update({
      where: { id: message.id },
      data: { providerMessageId: lead.id },
    });

    updated = true;
  }

  const snapshot = {
    provider: "INSTANTLY",
    providerLeadId: lead.id,
    providerCampaignId,
    status: lead.status,
    emailOpenCount: lead.email_open_count,
    emailReplyCount: lead.email_reply_count,
    emailClickCount: lead.email_click_count,
  };

  /*
   * SENT
   *
   * timestamp_last_contact tells us that Instantly has actually contacted
   * the lead. We never mark a queued message as sent merely because it was
   * added to an Instantly campaign.
   */
  if (lead.timestamp_last_contact) {
    const existingSent = await prisma.event.findFirst({
      where: {
        messageId: message.id,
        type: "SENT",
      },
    });

    if (!existingSent) {
      const created = await recordEventOnce(
        message.id,
        `${lead.id}:sent:${lead.timestamp_last_contact}`,
        "SENT",
        parseDate(lead.timestamp_last_contact),
        snapshot
      );

      if (created) {
        events += 1;
      }
    }

    if (!message.sentAt) {
      await prisma.message.update({
        where: { id: message.id },
        data: {
          sentAt: parseDate(lead.timestamp_last_contact),
          status: message.status === "QUEUED" ? "SENT" : undefined,
        },
      });

      updated = true;
    }
  }

  /*
   * OPENED
   *
   * Instantly exposes the number of opens. We compare that count with the
   * number of local OPENED events and create only the missing events.
   */
  const localOpened = await prisma.event.count({
    where: {
      messageId: message.id,
      type: "OPENED",
    },
  });

  if (lead.email_open_count > localOpened) {
    const missing = lead.email_open_count - localOpened;

    for (let i = localOpened + 1; i <= lead.email_open_count; i += 1) {
      const created = await recordEventOnce(
        message.id,
        `${lead.id}:opened:${i}`,
        "OPENED",
        parseDate(lead.timestamp_last_open),
        {
          ...snapshot,
          activityNumber: i,
        }
      );

      if (created) events += 1;
    }

    if (missing > 0) updated = true;
  }

  /*
   * CLICKED
   */
  const localClicked = await prisma.event.count({
    where: {
      messageId: message.id,
      type: "CLICKED",
    },
  });

  if (lead.email_click_count > localClicked) {
    for (
      let i = localClicked + 1;
      i <= lead.email_click_count;
      i += 1
    ) {
      const created = await recordEventOnce(
        message.id,
        `${lead.id}:clicked:${i}`,
        "CLICKED",
        parseDate(lead.timestamp_last_click),
        {
          ...snapshot,
          activityNumber: i,
        }
      );

      if (created) events += 1;
    }

    updated = true;
  }

  /*
   * REPLIED
   */
  const localReplies = await prisma.event.count({
    where: {
      messageId: message.id,
      type: "REPLIED",
    },
  });

  if (lead.email_reply_count > localReplies) {
    for (
      let i = localReplies + 1;
      i <= lead.email_reply_count;
      i += 1
    ) {
      const created = await recordEventOnce(
        message.id,
        `${lead.id}:replied:${i}`,
        "REPLIED",
        parseDate(lead.timestamp_last_reply),
        {
          ...snapshot,
          activityNumber: i,
        }
      );

      if (created) events += 1;
    }

    updated = true;
  }

  /*
   * BOUNCED
   *
   * Instantly's lead status -1 represents a bounced lead.
   */
  if (lead.status === -1) {
    const existingBounce = await prisma.event.findFirst({
      where: {
        messageId: message.id,
        type: "BOUNCED",
      },
    });

    if (!existingBounce) {
      const created = await recordEventOnce(
        message.id,
        `${lead.id}:bounced`,
        "BOUNCED",
        new Date(),
        snapshot
      );

      if (created) events += 1;
    }

    await prisma.suppressionEntry.upsert({
      where: {
        ownerId_email: {
          ownerId,
          email: message.contact.email,
        },
      },
      create: {
        ownerId,
        email: message.contact.email,
        reason: "BOUNCED",
      },
      update: {
        reason: "BOUNCED",
      },
    });

    updated = true;
  }

  /*
   * UNSUBSCRIBED
   *
   * Instantly's lead status -2 represents an unsubscribed lead.
   */
  if (lead.status === -2) {
    const existingUnsubscribe = await prisma.event.findFirst({
      where: {
        messageId: message.id,
        type: "UNSUBSCRIBED",
      },
    });

    if (!existingUnsubscribe) {
      const created = await recordEventOnce(
        message.id,
        `${lead.id}:unsubscribed`,
        "UNSUBSCRIBED",
        new Date(),
        snapshot
      );

      if (created) events += 1;
    }

    await prisma.suppressionEntry.upsert({
      where: {
        ownerId_email: {
          ownerId,
          email: message.contact.email,
        },
      },
      create: {
        ownerId,
        email: message.contact.email,
        reason: "UNSUBSCRIBED",
      },
      update: {
        reason: "UNSUBSCRIBED",
      },
    });

    updated = true;
  }

  if (updated || events > 0) {
    await engagementService.recalculateScore(message.contactId);
  }

  return { updated, events };
}

/**
 * Polls Instantly for activity on all mapped Reigna campaigns.
 *
 * This is intentionally read-only against Instantly. It does not send,
 * activate, pause, or modify leads.
 */
export async function syncInstantlyTracking(): Promise<TrackingSyncResult> {
  const result: TrackingSyncResult = {
    checked: 0,
    updated: 0,
    events: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  if (!isDatabaseConfigured || !prisma) {
    result.failed = 1;
    result.errors.push("Database is not connected.");
    return result;
  }

  if (!instantlyProvider.isConfigured()) {
    result.failed = 1;
    result.errors.push("Instantly is not configured.");
    return result;
  }

  const campaigns = await prisma.campaign.findMany({
    where: {
      providerMapping: {
        isNot: null,
      },
    },
    include: {
      providerMapping: true,
      messages: {
        where: {
          variant: "INITIAL",
          status: {
            in: ["QUEUED", "SENT", "FOLLOWED_UP"],
          },
        },
        include: {
          contact: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  for (const campaign of campaigns) {
    const mapping = campaign.providerMapping;

    if (!mapping) {
      result.skipped += 1;
      continue;
    }

    for (const message of campaign.messages) {
      result.checked += 1;

      try {
        const synced = await syncMessage(
            campaign.ownerId,
            mapping.providerCampaignId,
            message
        );

        if (synced.updated) result.updated += 1;
        result.events += synced.events;
      } catch (error) {
        result.failed += 1;
        result.errors.push(
          `${campaign.id}/${message.id}: ${
            error instanceof Error ? error.message : "Tracking sync failed."
          }`
        );
      }
    }

    await prisma.campaignProviderMapping.update({
      where: { id: mapping.id },
      data: { syncedAt: new Date() },
    });
  }

  return result;
}