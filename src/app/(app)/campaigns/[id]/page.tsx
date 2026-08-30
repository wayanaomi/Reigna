import { notFound } from "next/navigation";
import { campaignsService } from "@/lib/services/campaigns";
import { Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireOwnerId } from "@/lib/auth/session";
import { LaunchCampaignActions } from "@/components/campaigns/launch-campaign-actions";

function statusTone(status: string) {
  if (status === "ACTIVE") return "good" as const;
  if (status === "PAUSED") return "warning" as const;
  return "neutral" as const;
}

function messageTone(status: string) {
  if (status === "NEEDS_REVIEW") return "warning" as const;
  if (status === "SENT" || status === "FOLLOWED_UP" || status === "APPROVED" || status === "QUEUED") return "good" as const;
  if (status === "REJECTED" || status === "FAILED") return "critical" as const;
  return "neutral" as const;
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerId = await requireOwnerId();
  const campaign = await campaignsService.getById(ownerId, id);
  if (!campaign) notFound();

  const messages = await campaignsService.listMessages(ownerId, id);

  const stats = campaign.stats;
  const rows: [string, number][] = [
    ["Contacts", stats.contacts],
    ["Approved", stats.approved],
    ["Queued", stats.queued],
    ["Sent", stats.sent],
    ["Delivered", stats.delivered],
    ["Opened", stats.opened],
    ["Clicked", stats.clicked],
    ["Replied", stats.replied],
    ["Bounced", stats.bounced],
    ["Unsubscribed", stats.unsubscribed],
    ["Follow-ups sent", stats.followUpsSent],
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-10 border-b border-border-subtle pb-8">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple">Campaign</p>
          <span aria-hidden className="mt-2 block h-[2px] w-8 bg-gold" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl font-bold leading-[1.1] text-charcoal">{campaign.name}</h1>
          <StatusBadge tone={statusTone(campaign.status)}>{campaign.status.toLowerCase()}</StatusBadge>
        </div>
        <p className="mt-3 text-[15px] text-slate">
          Follow-up {campaign.followUpEnabled ? `enabled — ${campaign.followUpDelayDays} days after no open` : "disabled"}.
        </p>
        <div className="mt-5">
          <LaunchCampaignActions campaignId={campaign.id} status={campaign.status} />
        </div>
      </div>

      <Section index="01" title="Operational truth">
        <div className="grid grid-cols-2 gap-px bg-border-subtle sm:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="bg-surface px-5 py-4">
              <p className="font-display text-3xl font-bold text-charcoal">{value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate">{label}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section index="02" title="Messages">
        {messages.items.length === 0 ? (
          <EmptyState title="No messages yet." description="Reigna hasn't drafted anything for this campaign yet." />
        ) : (
          <div className="divide-y divide-border-subtle">
            {messages.items.map((message) => (
              <div key={message.id} className="flex items-center justify-between gap-4 py-3">
                <span className="truncate font-display text-[15px] font-semibold text-charcoal">{message.subject}</span>
                <StatusBadge tone={messageTone(message.status)}>
                  {message.status.replace("_", " ").toLowerCase()}
                </StatusBadge>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
