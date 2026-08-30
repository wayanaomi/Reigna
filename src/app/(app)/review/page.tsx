import { reviewService } from "@/lib/services/review";
import { contactsService } from "@/lib/services/contacts";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { requireOwnerId } from "@/lib/auth/session";
import { ReviewQueue } from "@/components/review/review-queue";

export default async function ReviewPage() {
  const ownerId = await requireOwnerId();
  const [review, contacts] = await Promise.all([
    reviewService.listNeedingReview(ownerId),
    contactsService.list(ownerId),
  ]);
  const contactById = new Map(contacts.items.map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Review"
        title="Review queue"
        description="Messages Reigna has researched and drafted, waiting on your approval."
      />

      {!review.configured ? (
        <EmptyState
          title="No database connection."
          description="Set DATABASE_URL and run a Prisma migration to bring your workspace online."
          action={<LinkButton href="/settings">View setup status</LinkButton>}
        />
      ) : review.error ? (
        <EmptyState title="Reigna couldn't load the review queue." description={review.error} tone="attention" />
      ) : review.items.length === 0 ? (
        <EmptyState
          title="Nothing needs your approval."
          description="Reigna will place researched messages here when they're ready to review."
        />
      ) : (
        <ReviewQueue
          items={review.items.map((message) => ({ message, contact: contactById.get(message.contactId) }))}
        />
      )}
    </div>
  );
}
