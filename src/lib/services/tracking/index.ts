import type { EventRecord } from "@/types";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { emptyError, emptyUnconfigured, ok, type ServiceListResult } from "@/lib/services/types";

/**
 * Tracking service boundary — delivery/open/click/reply/bounce events.
 * Events only exist once real messages have actually been sent; there is
 * no simulated activity. Note: open tracking is inherently imperfect (e.g.
 * Apple Mail Privacy Protection pre-fetches tracking pixels), so the UI
 * should present opens as a signal, not an absolute truth. See
 * /src/lib/services/tracking/ingest.ts for how inbound webhook events
 * become Event rows.
 */
export interface TrackingService {
  listByCampaign(ownerId: string, campaignId: string): Promise<ServiceListResult<EventRecord>>;
}

class PrismaTrackingService implements TrackingService {
  async listByCampaign(ownerId: string, campaignId: string): Promise<ServiceListResult<EventRecord>> {
    if (!isDatabaseConfigured || !prisma) return emptyUnconfigured();
    try {
      const rows = await prisma.event.findMany({
        where: { message: { campaignId, campaign: { ownerId } } },
        include: { message: { select: { contactId: true, campaignId: true } } },
        orderBy: { occurredAt: "desc" },
      });
      return ok(
        rows.map((row) => ({
          id: row.id,
          messageId: row.messageId,
          contactId: row.message.contactId,
          campaignId: row.message.campaignId,
          type: row.type,
          occurredAt: row.occurredAt.toISOString(),
        }))
      );
    } catch {
      return emptyError("Reigna couldn't reach the database.");
    }
  }
}

export const trackingService: TrackingService = new PrismaTrackingService();

