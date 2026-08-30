import Link from "next/link";
import { campaignsService } from "@/lib/services/campaigns";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireOwnerId } from "@/lib/auth/session";

function statusTone(status: string) {
  if (status === "ACTIVE") return "good" as const;
  if (status === "PAUSED") return "warning" as const;
  if (status === "COMPLETED") return "neutral" as const;
  return "neutral" as const;
}

export default async function CampaignsPage() {
  const ownerId = await requireOwnerId();
  const campaigns = await campaignsService.list(ownerId);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Campaigns"
        title="Outbound"
        description="Operational truth for every campaign — not vanity metrics."
        actions={<LinkButton href="/campaigns/new">New campaign</LinkButton>}
      />

      {!campaigns.configured ? (
        <EmptyState
          title="No database connection."
          description="Set DATABASE_URL and run a Prisma migration to bring your workspace online."
          action={<LinkButton href="/settings">View setup status</LinkButton>}
        />
      ) : campaigns.error ? (
        <EmptyState title="Reigna couldn't load campaigns." description={campaigns.error} tone="attention" />
      ) : campaigns.items.length === 0 ? (
        <EmptyState
          title="No outbound is running."
          description="Build your first campaign when your leads are ready."
          action={<LinkButton href="/leads">Go to leads</LinkButton>}
        />
      ) : (
        <div className="divide-y divide-border-subtle">
          {campaigns.items.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="-mx-5 flex items-center justify-between gap-4 border-l-2 border-transparent px-5 py-5 transition-colors hover:border-purple/25 hover:bg-surface-muted"
            >
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold text-charcoal">{campaign.name}</p>
                <p className="mt-1 text-xs text-slate">
                  {campaign.stats.contacts} contacts · {campaign.stats.sent} sent · {campaign.stats.replied} replied
                </p>
              </div>
              <StatusBadge tone={statusTone(campaign.status)}>{campaign.status.toLowerCase()}</StatusBadge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
