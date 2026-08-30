import { contactsService } from "@/lib/services/contacts";
import { sendingService } from "@/lib/services/sending";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { requireOwnerId } from "@/lib/auth/session";
import { CampaignWizard } from "@/components/campaigns/campaign-wizard";

export default async function NewCampaignPage() {
  const ownerId = await requireOwnerId();
  const [contacts, senders] = await Promise.all([
    contactsService.list(ownerId),
    sendingService.listSenderIdentities(ownerId),
  ]);

  const verifiedContacts = contacts.items.filter((c) => c.verificationStatus === "VERIFIED");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Campaigns"
        title="New campaign"
        description="Pick a sender and the verified leads you want to reach. Reigna drafts every first-touch message — nothing sends until you approve it."
      />

      {senders.items.length === 0 ? (
        <EmptyState
          title="No sending identity connected."
          description="Connect a mailbox before creating a campaign."
          action={<LinkButton href="/mailboxes">Connect mailbox</LinkButton>}
        />
      ) : verifiedContacts.length === 0 ? (
        <EmptyState
          title="No verified leads yet."
          description="Reigna can only add verified contacts to a campaign. Discover and verify some leads first."
          action={<LinkButton href="/discover">Discover prospects</LinkButton>}
        />
      ) : (
        <CampaignWizard senders={senders.items} contacts={verifiedContacts} />
      )}
    </div>
  );
}
