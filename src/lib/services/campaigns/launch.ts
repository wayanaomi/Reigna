import { prisma, isDatabaseConfigured } from "@/lib/db";
import { checkLaunchSafety } from "@/lib/services/sending/safety";
import { instantlyProvider } from "@/lib/providers/instantly";
import { suppressionService } from "@/lib/services/suppression";

export interface LaunchResult {
  ok: boolean;
  reasons?: string[];
  queued?: number;
  skipped?: number;
}

/**
 * Launches a campaign: creates (or reuses) the corresponding Instantly
 * campaign, adds every approved-but-not-yet-queued lead with its
 * human-approved first-touch message, then activates sending.
 *
 * This is the only path by which a message can start sending — it only
 * ever operates on messages already in `APPROVED` status, and it enforces
 * the suppression list one final time immediately before queuing (see
 * /docs/PRODUCT_DECISIONS.md — section 26).
 */
export async function launchCampaign(ownerId: string, campaignId: string): Promise<LaunchResult> {
  if (!isDatabaseConfigured || !prisma) return { ok: false, reasons: ["No database connection."] };
  if (!instantlyProvider.isConfigured()) return { ok: false, reasons: ["Instantly is not configured."] };

  const safety = await checkLaunchSafety(ownerId, campaignId);
  if (!safety.ok) return { ok: false, reasons: safety.reasons };

  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, ownerId } });
  if (!campaign) return { ok: false, reasons: ["Campaign not found."] };

  const sender = await prisma.senderIdentity.findFirst({ where: { id: campaign.senderIdentityId, ownerId, }, });
  if (!sender) return { ok: false, reasons: ["Sending identity not found."] };

  let mapping = await prisma.campaignProviderMapping.findUnique({ where: { campaignId } });
  if (!mapping) {
    const providerCampaignId = await instantlyProvider.createCampaign(campaign.name, sender.mailbox);
    mapping = await prisma.campaignProviderMapping.create({
      data: { campaignId, providerCampaignId, provider: "INSTANTLY" },
    });
  }

  const approvedMessages = await prisma.message.findMany({
    where: { campaignId, status: "APPROVED" },
    include: { contact: true },
  });

  let queued = 0;
  let skipped = 0;

  for (const message of approvedMessages) {
    const suppressed = await suppressionService.isSuppressed(ownerId, message.contact.email);
    if (suppressed || message.contact.verificationStatus !== "VERIFIED") {
      skipped += 1;
      await prisma.message.update({ where: { id: message.id }, data: { status: "FAILED" } });
      continue;
    }

    await instantlyProvider.addLead(mapping.providerCampaignId, {
      email: message.contact.email,
      firstName: message.contact.name.split(" ")[0],
      subject: message.subject,
      body: message.body,
    });
    await prisma.message.update({ where: { id: message.id }, data: { status: "QUEUED" } });
    queued += 1;
  }

  if (queued > 0) {
    await instantlyProvider.activateCampaign(mapping.providerCampaignId);
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "ACTIVE" } });
  }

  return { ok: true, queued, skipped };
}

/** Pauses a running campaign in both Reigna and Instantly. */
export async function pauseCampaign(ownerId: string, campaignId: string): Promise<void> {
  if (!isDatabaseConfigured || !prisma) throw new Error("No database connection.");
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, ownerId } });
  if (!campaign) throw new Error("Campaign not found.");

  const mapping = await prisma.campaignProviderMapping.findUnique({ where: { campaignId } });
  if (mapping && instantlyProvider.isConfigured()) {
    await instantlyProvider.pauseCampaign(mapping.providerCampaignId);
  }
  await prisma.campaign.update({ where: { id: campaignId }, data: { status: "PAUSED" } });
}
