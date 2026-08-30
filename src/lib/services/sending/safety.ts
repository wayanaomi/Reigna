import { prisma, isDatabaseConfigured } from "@/lib/db";
import { isIdentityHealthy } from "@/lib/services/sending";
import { toSenderIdentity } from "@/lib/services/mappers";

/**
 * Sending safety gate (see /docs/PRODUCT_DECISIONS.md — section 36/37).
 *
 * Every reason returned here is a hard block: Reigna will not launch a
 * campaign while any of these checks fail, and the UI must show the exact
 * reason rather than a generic failure.
 */
export interface SafetyCheckResult {
  ok: boolean;
  reasons: string[];
}

export async function checkLaunchSafety(ownerId: string, campaignId: string): Promise<SafetyCheckResult> {
  const reasons: string[] = [];
  if (!isDatabaseConfigured || !prisma) {
    return { ok: false, reasons: ["No database connection."] };
  }

  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, ownerId } });
  if (!campaign) return { ok: false, reasons: ["Campaign not found."] };

  const senderRow = await prisma.senderIdentity.findFirst({ where: { id: campaign.senderIdentityId, ownerId } });
  if (!senderRow) {
    reasons.push("No sending identity connected.");
  } else {
    const sender = toSenderIdentity(senderRow);
    if (!sender.spfValid) reasons.push("SPF is not configured for this domain.");
    if (!sender.dkimValid) reasons.push("DKIM is not configured for this domain.");
    if (!sender.dmarcValid) reasons.push("DMARC is not configured for this domain.");
    if (sender.bounceRate >= 2) reasons.push(`Bounce rate (${sender.bounceRate}%) is too high to send safely.`);
    if (sender.complaintRate >= 0.1) reasons.push(`Complaint rate (${sender.complaintRate}%) is too high to send safely.`);
    if (sender.warmupStatus === "WARMING") reasons.push("This mailbox is still warming up.");
    if (!isIdentityHealthy(sender) && reasons.length === 0) reasons.push("Sending identity failed its health check.");
  }

  const approvedCount = await prisma.message.count({ where: { campaignId, status: "APPROVED" } });
  const queuedOrSentCount = await prisma.message.count({
    where: { campaignId, status: { in: ["QUEUED", "SENT", "FOLLOWED_UP"] } },
  });
  if (approvedCount === 0 && queuedOrSentCount === 0) {
    reasons.push("No approved messages are ready to send.");
  }

  return { ok: reasons.length === 0, reasons };
}
