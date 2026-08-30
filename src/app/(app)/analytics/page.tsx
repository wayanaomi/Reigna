import { campaignsService } from "@/lib/services/campaigns";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { requireOwnerId } from "@/lib/auth/session";

export default async function AnalyticsPage() {
  const ownerId = await requireOwnerId();
  const campaigns = await campaignsService.list(ownerId);

  const totals = campaigns.items.reduce(
    (acc, c) => {
      acc.sent += c.stats.sent;
      acc.delivered += c.stats.delivered;
      acc.opened += c.stats.opened;
      acc.clicked += c.stats.clicked;
      acc.replied += c.stats.replied;
      acc.bounced += c.stats.bounced;
      acc.unsubscribed += c.stats.unsubscribed;
      return acc;
    },
    { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, unsubscribed: 0 }
  );

  const rows: [string, number][] = [
    ["Sent", totals.sent],
    ["Delivered", totals.delivered],
    ["Opened", totals.opened],
    ["Clicked", totals.clicked],
    ["Replied", totals.replied],
    ["Bounced", totals.bounced],
    ["Unsubscribed", totals.unsubscribed],
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Analytics"
        title="What happened"
        description="Tracking truth across every campaign. Opens are a signal, not a guarantee — some mail clients pre-fetch tracking pixels regardless of whether a person actually read the message."
      />

      {!campaigns.configured ? (
        <EmptyState
          title="No database connection."
          description="Set DATABASE_URL and run a Prisma migration to bring your workspace online."
          action={<LinkButton href="/settings">View setup status</LinkButton>}
        />
      ) : campaigns.items.length === 0 ? (
        <EmptyState title="Nothing has happened yet." description="Your activity will appear here once Reigna starts working." />
      ) : (
        <div className="grid grid-cols-2 gap-px bg-border-subtle sm:grid-cols-4">
          {rows.map(([label, value]) => (
            <div key={label} className="bg-surface px-5 py-4">
              <p className="font-display text-3xl font-bold text-charcoal">{value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
