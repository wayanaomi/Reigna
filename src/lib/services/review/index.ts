import type { Message } from "@/types";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { toMessage } from "@/lib/services/mappers";
import { emptyError, emptyUnconfigured, ok, type ServiceListResult } from "@/lib/services/types";

/**
 * Review queue service boundary — approve/edit/reject drafted messages
 * before they're queued for sending. Messages only exist once the real
 * research + personalization pipeline has written real drafts. Every
 * method is scoped to the authenticated owner via the message's campaign.
 */
export interface ReviewService {
  listNeedingReview(ownerId: string): Promise<ServiceListResult<Message>>;
  approve(ownerId: string, messageId: string): Promise<void>;
  reject(ownerId: string, messageId: string): Promise<void>;
  updateContent(ownerId: string, messageId: string, data: { subject: string; body: string }): Promise<void>;
}

class PrismaReviewService implements ReviewService {
  async listNeedingReview(ownerId: string): Promise<ServiceListResult<Message>> {
    if (!isDatabaseConfigured || !prisma) return emptyUnconfigured();
    try {
      const rows = await prisma.message.findMany({
        where: { status: "NEEDS_REVIEW", campaign: { ownerId } },
        orderBy: { createdAt: "asc" },
      });
      return ok(rows.map(toMessage));
    } catch {
      return emptyError("Reigna couldn't reach the database.");
    }
  }

  async approve(ownerId: string, messageId: string): Promise<void> {
    if (!isDatabaseConfigured || !prisma) throw new Error("Database is not connected.");
    await prisma.message.updateMany({
      where: { id: messageId, campaign: { ownerId } },
      data: { status: "APPROVED" },
    });
  }

  async reject(ownerId: string, messageId: string): Promise<void> {
    if (!isDatabaseConfigured || !prisma) throw new Error("Database is not connected.");
    await prisma.message.updateMany({
      where: { id: messageId, campaign: { ownerId } },
      data: { status: "REJECTED" },
    });
  }

  async updateContent(ownerId: string, messageId: string, data: { subject: string; body: string }): Promise<void> {
    if (!isDatabaseConfigured || !prisma) throw new Error("Database is not connected.");
    await prisma.message.updateMany({
      where: { id: messageId, campaign: { ownerId } },
      data: { subject: data.subject, body: data.body },
    });
  }
}

export const reviewService: ReviewService = new PrismaReviewService();
