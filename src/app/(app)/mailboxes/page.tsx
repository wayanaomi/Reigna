import {
  sendingService,
  isIdentityHealthy,
  getMailboxProviderStatus,
} from "@/lib/services/sending";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireOwnerId } from "@/lib/auth/session";
import { ConnectMailboxButtons } from "@/components/mailboxes/connect-mailbox";
import { InstantlyMailboxes } from "@/components/mailboxes/instantly-mailboxes";

export default async function MailboxesPage() {
  const ownerId = await requireOwnerId();

  const senders = await sendingService.listSenderIdentities(ownerId);
  const providerStatus = getMailboxProviderStatus();

  const canConnect =
    providerStatus.google || providerStatus.microsoft;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Mailboxes"
        title="Sender health"
        description="Can you safely send? SPF, DKIM, DMARC, caps, and warm-up — all in one place."
      />

      {/* Google / Microsoft OAuth */}
      {canConnect ? (
        <div className="mb-8">
          <ConnectMailboxButtons
            google={providerStatus.google}
            microsoft={providerStatus.microsoft}
          />
        </div>
      ) : null}

      {/* Instantly */}
      {providerStatus.instantly ? (
        <section className="mb-8">
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate">
              Instantly
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold text-charcoal">
              Connected mailboxes
            </h2>

            <p className="mt-1 max-w-2xl text-sm text-slate">
              Import an existing Instantly mailbox into Reigna. Reigna does
              not need your mailbox password — Instantly remains responsible
              for the actual mailbox connection and sending infrastructure.
            </p>
          </div>

          <InstantlyMailboxes />
        </section>
      ) : null}

      {/* Reigna sender identities */}
      {!senders.configured ? (
        <EmptyState
          title="No database connection."
          description="Set DATABASE_URL and run a Prisma migration to bring your workspace online."
          action={
            <LinkButton href="/settings">
              View setup status
            </LinkButton>
          }
        />
      ) : senders.error ? (
        <EmptyState
          title="Reigna couldn't load your mailboxes."
          description={senders.error}
          tone="attention"
        />
      ) : senders.items.length === 0 ? (
        <EmptyState
          title="No sending identity connected."
          description={
            canConnect || providerStatus.instantly
              ? "Connect or import a mailbox before sending."
              : "Connect a mailbox before sending. Google/Microsoft OAuth credentials aren't configured yet — add them to your environment to enable connection."
          }
          action={
            canConnect ? (
              <LinkButton href="/settings">
                Connect mailbox
              </LinkButton>
            ) : undefined
          }
        />
      ) : (
        <section>
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate">
              Reigna
            </p>

            <h2 className="mt-1 font-display text-xl font-semibold text-charcoal">
              Sender identities
            </h2>

            <p className="mt-1 text-sm text-slate">
              Mailboxes currently available for campaigns in Reigna.
            </p>
          </div>

          <div className="space-y-px bg-border-subtle">
            {senders.items.map((identity) => (
              <div
                key={identity.id}
                className="bg-surface px-6 py-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-display text-lg font-semibold text-charcoal">
                    {identity.mailbox}
                  </p>

                  <StatusBadge
                    tone={
                      isIdentityHealthy(identity)
                        ? "good"
                        : "critical"
                    }
                  >
                    {isIdentityHealthy(identity)
                      ? "Healthy"
                      : "Needs attention"}
                  </StatusBadge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-y-2 text-xs text-slate sm:grid-cols-4">
                  <span>
                    SPF{" "}
                    <span className="text-charcoal">
                      {identity.spfValid ? "valid" : "invalid"}
                    </span>
                  </span>

                  <span>
                    DKIM{" "}
                    <span className="text-charcoal">
                      {identity.dkimValid ? "valid" : "invalid"}
                    </span>
                  </span>

                  <span>
                    DMARC{" "}
                    <span className="text-charcoal">
                      {identity.dmarcValid ? "valid" : "invalid"}
                    </span>
                  </span>

                  <span>
                    Warm-up{" "}
                    <span className="text-charcoal">
                      {identity.warmupStatus.toLowerCase()}
                    </span>
                  </span>

                  <span>
                    Today{" "}
                    <span className="text-charcoal">
                      {identity.sentToday}/{identity.dailyCap}
                    </span>
                  </span>

                  <span>
                    Bounce{" "}
                    <span className="text-charcoal">
                      {identity.bounceRate}%
                    </span>
                  </span>

                  <span>
                    Complaints{" "}
                    <span className="text-charcoal">
                      {identity.complaintRate}%
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}