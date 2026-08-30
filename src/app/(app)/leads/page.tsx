import { contactsService } from "@/lib/services/contacts";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { LeadRow } from "@/components/leads/lead-row";
import { requireOwnerId } from "@/lib/auth/session";

export default async function LeadsPage() {
  const ownerId = await requireOwnerId();
  const contacts = await contactsService.list(ownerId);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Leads"
        title="Your pipeline"
        description={
          contacts.configured && contacts.items.length > 0
            ? `${contacts.items.length} ${contacts.items.length === 1 ? "contact" : "contacts"} under research.`
            : "Every person Reigna has found and researched lives here."
        }
      />

      {!contacts.configured ? (
        <EmptyState
          title="No database connection."
          description="Set DATABASE_URL and run a Prisma migration to bring your workspace online."
          action={<LinkButton href="/settings">View setup status</LinkButton>}
        />
      ) : contacts.error ? (
        <EmptyState title="Reigna couldn't load your leads." description={contacts.error} tone="attention" />
      ) : contacts.items.length === 0 ? (
        <EmptyState
          title="Your pipeline is empty."
          description="Tell Reigna who you're looking for."
          action={<LinkButton href="/discover">Discover prospects</LinkButton>}
        />
      ) : (
        <div className="divide-y divide-border-subtle">
          {contacts.items.map((contact) => (
            <LeadRow key={contact.id} contact={contact} />
          ))}
        </div>
      )}
    </div>
  );
}
