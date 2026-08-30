import { suppressionService } from "@/lib/services/suppression";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireOwnerId } from "@/lib/auth/session";

export default async function SuppressionPage() {
  const ownerId = await requireOwnerId();
  const suppression = await suppressionService.list(ownerId);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Suppression"
        title="Do-not-contact list"
        description="Every address here is permanently excluded from outbound."
      />

      {!suppression.configured ? (
        <EmptyState
          title="No database connection."
          description="Set DATABASE_URL and run a Prisma migration to bring your workspace online."
          action={<LinkButton href="/settings">View setup status</LinkButton>}
        />
      ) : suppression.error ? (
        <EmptyState title="Reigna couldn't load the suppression list." description={suppression.error} tone="attention" />
      ) : suppression.items.length === 0 ? (
        <EmptyState
          title="Nothing is suppressed."
          description="Unsubscribes, bounces, and complaints will appear here automatically."
        />
      ) : (
        <div className="divide-y divide-border-subtle">
          {suppression.items.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-4 py-3">
              <span className="truncate text-sm font-medium text-charcoal">{entry.email}</span>
              <StatusBadge tone="neutral">{entry.reason.toLowerCase()}</StatusBadge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
