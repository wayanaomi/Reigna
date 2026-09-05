import { prisma, isDatabaseConfigured } from "@/lib/db";
import { launchCampaign } from "@/lib/services/campaigns/launch";
import { findFollowUpCandidates } from "@/lib/services/campaigns/follow-up";

export interface SchedulerResult {
  checked: number;
  launched: number;
  skipped: number;
  failed: number;
  followUpCandidates: number;
  errors: string[];
}

/**
 * Runs Reigna's scheduled campaign work.
 *
 * This function never bypasses:
 * - sender health checks
 * - suppression checks
 * - verification checks
 * - human approval
 * - Instantly
 *
 * Follow-ups are currently detected separately and are NOT sent by
 * this worker until the provider's verified sequence operation is wired.
 */
export async function processScheduledCampaigns(): Promise<SchedulerResult> {
  if (!isDatabaseConfigured || !prisma) {
    return {
      checked: 0,
      launched: 0,
      skipped: 0,
      failed: 0,
      followUpCandidates: 0,
      errors: ["No database connection."],
    };
  }

  const now = new Date();

  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "DRAFT",
      scheduleEnabled: true,
      scheduledAt: {
        lte: now,
      },
    },
    select: {
      id: true,
      ownerId: true,
    },
    orderBy: {
      scheduledAt: "asc",
    },
    take: 25,
  });

  let launched = 0;
  let skipped = 0;
  let failed = 0;

  const errors: string[] = [];

  for (const campaign of campaigns) {
    try {
      const result = await launchCampaign(
        campaign.ownerId,
        campaign.id
      );

      if (!result.ok) {
        skipped += 1;

        errors.push(
          `${campaign.id}: ${
            result.reasons?.join("; ") ??
            "Campaign could not be launched."
          }`
        );

        continue;
      }

      launched += 1;

      await prisma.campaign.update({
        where: {
          id: campaign.id,
        },
        data: {
          scheduleEnabled: false,
        },
      });
    } catch (error) {
      failed += 1;

      errors.push(
        `${campaign.id}: ${
          error instanceof Error
            ? error.message
            : "Unknown scheduler error."
        }`
      );
    }
  }

  /*
   * Follow-up eligibility scan.
   *
   * This intentionally does NOT send anything yet.
   * It only identifies contacts that have:
   * - a SENT initial message
   * - passed the configured follow-up delay
   * - no follow-up already created
   * - no open
   * - no click
   * - no reply
   * - no bounce
   * - no unsubscribe
   * - no complaint
   * - no suppression
   */
  let followUpCandidates = 0;

  try {
    const ownerIds = [
      ...new Set(campaigns.map((campaign) => campaign.ownerId)),
    ];

    for (const ownerId of ownerIds) {
      const candidates = await findFollowUpCandidates(ownerId);
      followUpCandidates += candidates.length;
    }
  } catch (error) {
    errors.push(
      `Follow-up scan: ${
        error instanceof Error
          ? error.message
          : "Unknown follow-up scan error."
      }`
    );
  }

  return {
    checked: campaigns.length,
    launched,
    skipped,
    failed,
    followUpCandidates,
    errors,
  };
}