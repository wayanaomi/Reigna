import { contactsService } from "@/lib/services/contacts";
import { engagementService } from "@/lib/services/engagement";
import { reviewService } from "@/lib/services/review";
import { campaignsService } from "@/lib/services/campaigns";
import { sendingService, isIdentityHealthy } from "@/lib/services/sending";
import { requireOwnerId } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { LinkButton } from "@/components/ui/link-button";
import { Section } from "@/components/ui/section";
import { TalkToTodayRow } from "@/components/command-center/talk-to-today-row";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function CommandCenterPage() {
  const ownerId = await requireOwnerId();

  const [contacts, talkToToday, review, campaigns, senders] =
    await Promise.all([
      contactsService.list(ownerId),
      engagementService.talkToToday(ownerId),
      reviewService.listNeedingReview(ownerId),
      campaignsService.list(ownerId),
      sendingService.listSenderIdentities(ownerId),
    ]);
    
  if (!contacts.configured) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple">{getGreeting()}</p>
          <span aria-hidden className="mt-2 block h-[2px] w-8 bg-gold" />
        </div>
        <h1 className="font-display text-4xl font-bold leading-[1.1] text-charcoal">
          Reigna isn&rsquo;t connected yet.
        </h1>
        <EmptyState
          className="mt-10"
          title="No database connection."
          description="Set DATABASE_URL and run a Prisma migration to bring your workspace online. Nothing is fabricated in the meantime."
          action={<LinkButton href="/settings">View setup status</LinkButton>}
        />
      </div>
    );
  }

  const healthySenders = senders.items.filter(isIdentityHealthy).length;
  const statusLine =
    senders.items.length === 0
      ? "Nothing has happened yet."
      : healthySenders === senders.items.length
        ? "Your outbound is healthy."
        : "One or more sending identities need attention.";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple">{getGreeting()}</p>
        <span aria-hidden className="mt-2 block h-[2px] w-8 bg-gold" />
      </div>
      <h1 className="font-display text-4xl font-bold leading-[1.1] text-charcoal">
        Here&rsquo;s where things stand.
      </h1>
      <p className="mt-3 text-[15px] text-slate">{statusLine}</p>

      <Section
        index="01"
        title="Talk to today"
        meta={talkToToday.items.length ? `${talkToToday.items.length} ${talkToToday.items.length === 1 ? "person" : "people"}` : undefined}
      >
        {talkToToday.items.length === 0 ? (
          <EmptyState
            title="Your pipeline is empty."
            description="Tell Reigna who you're looking for and it will start researching prospects worth your time."
            action={<LinkButton href="/discover">Discover prospects</LinkButton>}
          />
        ) : (
          <div className="divide-y divide-border-subtle">
            {talkToToday.items.map((item, index) => (
              <TalkToTodayRow key={item.contact.id} item={item} highlight={index === 0} />
            ))}
          </div>
        )}
      </Section>

      <Section
        index="02"
        title="Needs your approval"
        meta={review.items.length ? `${review.items.length} waiting` : undefined}
      >
        {review.items.length === 0 ? (
          <EmptyState
            title="Nothing needs your approval."
            description="Reigna will place researched messages here when they're ready to review."
          />
        ) : (
          <>
            <div className="divide-y divide-border-subtle">
              {review.items.slice(0, 5).map((message) => (
                <div key={message.id} className="flex items-center justify-between gap-4 py-3">
                  <span className="truncate font-display text-[15px] font-semibold text-charcoal">
                    {message.subject}
                  </span>
                  <StatusBadge tone="warning">Needs review</StatusBadge>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <LinkButton href="/review" variant="secondary" size="sm">
                Open review queue
              </LinkButton>
            </div>
          </>
        )}
      </Section>

      <Section index="03" title="Campaigns">
        {campaigns.items.length === 0 ? (
          <EmptyState
            title="No outbound is running."
            description="Build your first campaign when your leads are ready."
            action={<LinkButton href="/campaigns">Create campaign</LinkButton>}
          />
        ) : (
          <div className="divide-y divide-border-subtle">
            {campaigns.items.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-[15px] font-semibold text-charcoal">{campaign.name}</p>
                  <p className="text-xs text-slate">
                    {campaign.stats.replied} replied · {campaign.stats.sent} sent
                  </p>
                </div>
                <StatusBadge
                  tone={campaign.status === "ACTIVE" ? "good" : campaign.status === "PAUSED" ? "warning" : "neutral"}
                >
                  {campaign.status.toLowerCase()}
                </StatusBadge>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section index="04" title="Sender health">
        {senders.items.length === 0 ? (
          <EmptyState
            title="No sending identity connected."
            description="Connect a mailbox before sending."
            action={<LinkButton href="/mailboxes">Connect mailbox</LinkButton>}
          />
        ) : (
          <div className="divide-y divide-border-subtle">
            {senders.items.map((identity) => (
              <div key={identity.id} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm font-medium text-charcoal">{identity.mailbox}</span>
                <StatusBadge tone={isIdentityHealthy(identity) ? "good" : "critical"}>
                  {isIdentityHealthy(identity) ? "Healthy" : "Needs attention"}
                </StatusBadge>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
