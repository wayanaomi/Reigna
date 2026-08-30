import type { TalkToTodayItem } from "@/types";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { toContact } from "@/lib/services/mappers";
import { emptyError, emptyUnconfigured, ok, type ServiceListResult } from "@/lib/services/types";

/**
 * Engagement / "Talk to Today" service boundary.
 *
 * Ranks real, verified contacts by their persisted engagement score. A
 * contact's score, research summary, and recommendation are only ever set
 * by the real research/tracking pipeline — this service never invents a
 * reason to contact someone.
 *
 * Scoring model (documented; recalculated from real events, never blindly
 * incremented — see `recalculateScore`):
 *   Reply            +60
 *   Click             +25
 *   Open              +10 (each additional open after the first: +2, capped at +6 total bonus)
 *   Bounce           -100
 *   Unsubscribe      -100
 *   Not interested    -80
 *   Out of office       0
 * Score is clamped to [0, 100].
 */
export interface EngagementService {
  talkToToday(ownerId: string): Promise<ServiceListResult<TalkToTodayItem>>;
  recalculateScore(contactId: string): Promise<number>;
}

function computeScoreFromEvents(events: { type: string }[]): number {
  let score = 0;
  let openCount = 0;

  for (const event of events) {
    switch (event.type) {
      case "REPLIED":
      case "INTERESTED":
        score += 60;
        break;
      case "CLICKED":
        score += 25;
        break;
      case "OPENED":
        openCount += 1;
        break;
      case "BOUNCED":
        score -= 100;
        break;
      case "UNSUBSCRIBED":
      case "COMPLAINED":
        score -= 100;
        break;
      case "NOT_INTERESTED":
      case "WRONG_PERSON":
        score -= 80;
        break;
      case "OUT_OF_OFFICE":
      case "AUTO_REPLIED":
        score += 0;
        break;
      default:
        break;
    }
  }

  if (openCount > 0) {
    score += 10 + Math.min(openCount - 1, 3) * 2;
  }

  return Math.max(0, Math.min(100, score));
}

class PrismaEngagementService implements EngagementService {
  async talkToToday(ownerId: string): Promise<ServiceListResult<TalkToTodayItem>> {
    if (!isDatabaseConfigured || !prisma) return emptyUnconfigured();
    try {
      const rows = await prisma.contact.findMany({
        where: { ownerId, verificationStatus: "VERIFIED" },
        orderBy: { engagementScore: "desc" },
        take: 5,
      });
      const items = rows.map((row) => {
        const contact = toContact(row);
        const priority: TalkToTodayItem["priority"] =
          contact.engagementScore >= 70 ? "high" : contact.engagementScore >= 40 ? "medium" : "low";
        return {
          contact,
          reason: contact.whyThisPerson ?? "No research reason recorded yet.",
          latestSignal: contact.researchSignals?.[0]?.detail ?? "No research signal recorded yet.",
          recommendedAction: contact.recommendation ?? "Review and decide.",
          priority,
        } satisfies TalkToTodayItem;
      });
      return ok(items);
    } catch {
      return emptyError("Reigna couldn't reach the database.");
    }
  }

  /** Recomputes a contact's engagement score from its real event history. */
  async recalculateScore(contactId: string): Promise<number> {
    if (!isDatabaseConfigured || !prisma) return 0;
    const events = await prisma.event.findMany({
      where: { message: { contactId } },
      select: { type: true },
    });
    const score = computeScoreFromEvents(events);
    await prisma.contact.update({ where: { id: contactId }, data: { engagementScore: score } });
    return score;
  }
}

export const engagementService: EngagementService = new PrismaEngagementService();
