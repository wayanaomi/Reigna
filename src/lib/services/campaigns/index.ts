import type { Campaign, CampaignStats, Message } from "@/types";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import {
  toCampaign,
  toMessage,
  zeroCampaignStats,
} from "@/lib/services/mappers";
import {
  emptyError,
  emptyUnconfigured,
  ok,
  type ServiceListResult,
} from "@/lib/services/types";

export interface CreateCampaignInput {
  name: string;
  senderIdentityId: string;
  contactIds: string[];

  followUpEnabled?: boolean;
  followUpDelayDays?: number;

  scheduleEnabled?: boolean;
  scheduledAt?: Date | null;
  timezone?: string;
}

/**
 * Campaigns service boundary.
 *
 * Stats are computed live from Message/Event rows on every read rather
 * than stored/cached, so they can never drift from operational truth.
 *
 * Every method is scoped to the authenticated owner.
 */
export interface CampaignsService {
  list(ownerId: string): Promise<ServiceListResult<Campaign>>;
  getById(ownerId: string, id: string): Promise<Campaign | null>;
  listMessages(
    ownerId: string,
    campaignId: string
  ): Promise<ServiceListResult<Message>>;
  listMessagesForContact(
    ownerId: string,
    contactId: string
  ): Promise<ServiceListResult<Message>>;
  create(
    ownerId: string,
    input: CreateCampaignInput
  ): Promise<Campaign>;
}

async function computeStats(
  campaignId: string
): Promise<CampaignStats> {
  if (!prisma) {
    return zeroCampaignStats();
  }

  const contacts = await prisma.campaignContact.count({
    where: {
      campaignId,
    },
  });

  const approved = await prisma.message.count({
    where: {
      campaignId,
      status: {
        in: [
          "APPROVED",
          "QUEUED",
          "SENT",
          "FOLLOWED_UP",
        ],
      },
    },
  });

  const queued = await prisma.message.count({
    where: {
      campaignId,
      status: "QUEUED",
    },
  });

  const sent = await prisma.message.count({
    where: {
      campaignId,
      sentAt: {
        not: null,
      },
    },
  });

  const followUpsSent = await prisma.message.count({
    where: {
      campaignId,
      variant: "FOLLOW_UP",
      sentAt: {
        not: null,
      },
    },
  });

  const delivered = await prisma.event.count({
    where: {
      type: "DELIVERED",
      message: {
        campaignId,
      },
    },
  });

  const opened = await prisma.event.count({
    where: {
      type: "OPENED",
      message: {
        campaignId,
      },
    },
  });

  const clicked = await prisma.event.count({
    where: {
      type: "CLICKED",
      message: {
        campaignId,
      },
    },
  });

  const replied = await prisma.event.count({
    where: {
      type: "REPLIED",
      message: {
        campaignId,
      },
    },
  });

  const bounced = await prisma.event.count({
    where: {
      type: "BOUNCED",
      message: {
        campaignId,
      },
    },
  });

  const unsubscribed = await prisma.event.count({
    where: {
      type: "UNSUBSCRIBED",
      message: {
        campaignId,
      },
    },
  });

  return {
    contacts,
    approved,
    queued,
    sent,
    delivered,
    opened,
    clicked,
    replied,
    bounced,
    unsubscribed,
    followUpsSent,
  };
}

class PrismaCampaignsService
  implements CampaignsService
{
  async list(
    ownerId: string
  ): Promise<ServiceListResult<Campaign>> {
    if (!isDatabaseConfigured || !prisma) {
      return emptyUnconfigured();
    }

    try {
      const rows = await prisma.campaign.findMany({
        where: {
          ownerId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const campaigns = await Promise.all(
        rows.map(async (row) =>
          toCampaign(
            row,
            await computeStats(row.id)
          )
        )
      );

      return ok(campaigns);
    } catch {
      return emptyError(
        "Reigna couldn't reach the database."
      );
    }
  }

  async getById(
    ownerId: string,
    id: string
  ): Promise<Campaign | null> {
    if (!isDatabaseConfigured || !prisma) {
      return null;
    }

    try {
      const row = await prisma.campaign.findFirst({
        where: {
          id,
          ownerId,
        },
      });

      if (!row) {
        return null;
      }

      return toCampaign(
        row,
        await computeStats(row.id)
      );
    } catch {
      return null;
    }
  }

  async listMessages(
    ownerId: string,
    campaignId: string
  ): Promise<ServiceListResult<Message>> {
    if (!isDatabaseConfigured || !prisma) {
      return emptyUnconfigured();
    }

    try {
      const rows = await prisma.message.findMany({
        where: {
          campaignId,
          campaign: {
            ownerId,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return ok(rows.map(toMessage));
    } catch {
      return emptyError(
        "Reigna couldn't reach the database."
      );
    }
  }

  async listMessagesForContact(
    ownerId: string,
    contactId: string
  ): Promise<ServiceListResult<Message>> {
    if (!isDatabaseConfigured || !prisma) {
      return emptyUnconfigured();
    }

    try {
      const rows = await prisma.message.findMany({
        where: {
          contactId,
          campaign: {
            ownerId,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return ok(rows.map(toMessage));
    } catch {
      return emptyError(
        "Reigna couldn't reach the database."
      );
    }
  }

  async create(
    ownerId: string,
    input: CreateCampaignInput
  ): Promise<Campaign> {
    if (!isDatabaseConfigured || !prisma) {
      throw new Error(
        "Database is not connected."
      );
    }

    const name = input.name.trim();

    if (!name) {
      throw new Error(
        "Campaign name is required."
      );
    }

    if (!input.senderIdentityId) {
      throw new Error(
        "A sending identity is required."
      );
    }

    const contactIds = [
      ...new Set(input.contactIds),
    ];

    if (contactIds.length === 0) {
      throw new Error(
        "At least one contact is required."
      );
    }

    const row = await prisma.$transaction(
      async (tx) => {
        /*
         * Verify that the selected sending identity
         * belongs to the authenticated owner.
         */
        const senderIdentity =
          await tx.senderIdentity.findFirst({
            where: {
              id: input.senderIdentityId,
              ownerId,
            },
          });

        if (!senderIdentity) {
          throw new Error(
            "Sending identity not found."
          );
        }

        /*
         * Verify that every selected contact belongs
         * to the authenticated owner.
         */
        const contacts =
          await tx.contact.findMany({
            where: {
              id: {
                in: contactIds,
              },
              ownerId,
              verificationStatus: "VERIFIED",
            },
            select: {
              id: true,
            },
          });

        if (
          contacts.length !==
          contactIds.length
        ) {
          throw new Error(
            "One or more selected contacts are missing, unauthorized, or not verified."
          );
        }

        return tx.campaign.create({
          data: {
            ownerId,
            name,
            senderIdentityId: senderIdentity.id,

            followUpEnabled:
            input.followUpEnabled ?? true,

            followUpDelayDays:
            input.followUpDelayDays ?? 4,

            scheduleEnabled:
            input.scheduleEnabled ?? false,

            scheduledAt:
            input.scheduledAt ?? null,

            timezone:
            input.timezone ?? "Africa/Lagos",

            contacts: {
            create: contactIds.map(
            (contactId) => ({
            contactId,
        })
      ),
    },
  },
});
      }
    );

    return toCampaign(
      row,
      await computeStats(row.id)
    );
  }
}

export const campaignsService: CampaignsService =
  new PrismaCampaignsService();