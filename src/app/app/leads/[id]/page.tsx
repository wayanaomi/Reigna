import { notFound } from "next/navigation";
import { contactsService } from "@/lib/services/contacts";
import { campaignsService } from "@/lib/services/campaigns";
import { Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { LeadDraftActions } from "@/components/leads/lead-draft-actions";
import { RunResearchButton, RegenerateDraftButton } from "@/components/leads/research-actions";
import { requireOwnerId } from "@/lib/auth/session";

function verificationTone(status: string) {
  if (status === "VERIFIED") return "good" as const;
  if (status === "RISKY") return "warning" as const;
  if (status === "INVALID") return "critical" as const;
  return "neutral" as const;
}

function messageTone(status: string) {
  if (status === "NEEDS_REVIEW") return "warning" as const;
  if (status === "SENT" || status === "FOLLOWED_UP" || status === "APPROVED" || status === "QUEUED") return "good" as const;
  if (status === "REJECTED" || status === "FAILED") return "critical" as const;
  return "neutral" as const;
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerId = await requireOwnerId();
  const contact = await contactsService.getById(ownerId, id);
  if (!contact) notFound();

  const messages = await campaignsService.listMessagesForContact(ownerId, id);
  const latest = messages.items[0];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-10 border-b border-border-subtle pb-8">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple">Contact</p>
          <span aria-hidden className="mt-2 block h-[2px] w-8 bg-gold" />
        </div>
        <h1 className="font-display text-4xl font-bold leading-[1.1] text-charcoal">{contact.name}</h1>
        <p className="mt-3 text-[15px] text-slate">
          {contact.title} · {contact.company}
        </p>
      </div>

      <Section index="01" title="Why this person">
        {contact.whyThisPerson ? (
          <p className="text-[15px] leading-relaxed text-charcoal">{contact.whyThisPerson}</p>
        ) : (
          <EmptyState
            title="No reason recorded yet."
            description="Reigna hasn't finished researching why this contact matters."
          />
        )}
      </Section>

      <Section index="02" title="Research">
        <div className="mb-4">
          <RunResearchButton contactId={contact.id} />
        </div>
        {contact.researchSignals && contact.researchSignals.length > 0 ? (
          <ul className="space-y-px bg-border-subtle">
            {contact.researchSignals.map((signal, index) => (
              <li key={index} className="bg-surface px-5 py-4">
                <p className="font-display text-[15px] font-semibold text-charcoal">{signal.label}</p>
                <p className="mt-1 text-sm text-slate">{signal.detail}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate">Source: {signal.source}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No research yet." description="Reigna hasn't gathered public signals for this contact." />
        )}
      </Section>

      <Section index="03" title="Email intelligence">
        <div className="flex items-center justify-between gap-4 border-l-2 border-purple/20 py-3 pl-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-charcoal">{contact.email}</p>
            <p className="text-xs uppercase tracking-wide text-slate">Source: {contact.source.toLowerCase()}</p>
          </div>
          <StatusBadge tone={verificationTone(contact.verificationStatus)}>
            {contact.verificationStatus.toLowerCase()}
          </StatusBadge>
        </div>
      </Section>

      <Section index="04" title="Reigna's recommendation">
        {contact.recommendation ? (
          <p className="text-[15px] leading-relaxed text-charcoal">{contact.recommendation}</p>
        ) : (
          <EmptyState
            title="No recommendation yet."
            description="Reigna hasn't finished deciding whether this contact is worth contacting today."
          />
        )}
      </Section>

      <Section index="05" title="Draft">
        {!latest ? (
          <EmptyState title="No draft yet." description="Reigna hasn't written to this contact yet." />
        ) : (
          <div className="space-y-4">
            <div className="border-t-2 border-t-purple/25 bg-surface px-6 py-6">
              <div className="flex items-center justify-between gap-4">
                <p className="font-display text-xl font-bold text-charcoal">{latest.subject}</p>
                <StatusBadge tone={messageTone(latest.status)}>
                  {latest.status.replace("_", " ").toLowerCase()}
                </StatusBadge>
              </div>
              <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-charcoal">{latest.body}</p>
              {latest.researchBasis ? (
                <p className="mt-4 border-t border-border-subtle pt-4 text-xs italic leading-relaxed text-slate">
                  {latest.researchBasis}
                </p>
              ) : null}
            </div>
            {latest.status === "NEEDS_REVIEW" ? (
              <div className="flex flex-wrap items-center gap-2">
                <LeadDraftActions messageId={latest.id} contactId={contact.id} />
                <RegenerateDraftButton messageId={latest.id} contactId={contact.id} />
              </div>
            ) : null}
          </div>
        )}
      </Section>
    </div>
  );
}
