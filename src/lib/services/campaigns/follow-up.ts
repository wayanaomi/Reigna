import { prisma, isDatabaseConfigured } from "@/lib/db";
import { suppressionService } from "@/lib/services/suppression";

export interface FollowUpCandidate {
  messageId: string;
  campaignId: string;
  contactId: string;
  email: string;
}

export async function findFollowUpCandidates(
  ownerId: string
): Promise<FollowUpCandidate[]> {
  if (!isDatabaseConfigured || !prisma) return [];

  const campaigns = await prisma.campaign.findMany({
    where: {
      ownerId,
      status: "ACTIVE",
      followUpEnabled: true,
    },
    include: {
      messages: {
        where: {
          variant: "INITIAL",
          status: "SENT",
          sentAt: {
            not: null,
          },
        },
        include: {
          contact: true,
        },
      },
    },
  });

  const candidates: FollowUpCandidate[] = [];

  for (const campaign of campaigns) {
    const cutoff = new Date(
      Date.now() - campaign.followUpDelayDays * 24 * 60 * 60 * 1000
    );

    for (const message of campaign.messages) {
      if (!message.sentAt || message.sentAt > cutoff) {
        continue;
      }

      /*
       * One follow-up maximum.
       */
      const existingFollowUp = await prisma.message.findFirst({
        where: {
          campaignId: campaign.id,
          contactId: message.contactId,
          variant: "FOLLOW_UP",
        },
      });

      if (existingFollowUp) {
        continue;
      }

      /*
       * Never follow up after:
       * - open
       * - click
       * - reply
       * - bounce
       * - unsubscribe
       * - complaint
       */
      const blockingEvent = await prisma.event.findFirst({
        where: {
          messageId: message.id,
          type: {
            in: [
              "OPENED",
              "CLICKED",
              "REPLIED",
              "BOUNCED",
              "UNSUBSCRIBED",
              "COMPLAINED",
            ],
          },
        },
      });

      if (blockingEvent) {
        continue;
      }

      if (
        await suppressionService.isSuppressed(
          ownerId,
          message.contact.email
        )
      ) {
        continue;
      }

      candidates.push({
        messageId: message.id,
        campaignId: campaign.id,
        contactId: message.contactId,
        email: message.contact.email,
      });
    }
  }

  return candidates;
}