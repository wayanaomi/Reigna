import { prisma, isDatabaseConfigured } from "@/lib/db";
import { launchCampaign } from "@/lib/services/campaigns/launch";

export interface SchedulerResult {
  checked: number;
  launched: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * Finds scheduled campaigns whose launch time has arrived
 * and sends them through the exact same safety-gated launch
 * path used by manual campaign launches.
 *
 * This function never bypasses:
 * - sender health checks
 * - suppression checks
 * - verification checks
 * - human approval
 * - Instantly
 */
export async function processScheduledCampaigns(): Promise<SchedulerResult> {
  if (!isDatabaseConfigured || !prisma) {
    return {
      checked: 0,
      launched: 0,
      skipped: 0,
      failed: 0,
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

  return {
    checked: campaigns.length,
    launched,
    skipped,
    failed,
    errors,
  };
}