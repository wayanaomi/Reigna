import { discoveryService } from "@/lib/services/discovery";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageHeader } from "@/components/ui/page-header";
import { DiscoverForm } from "@/components/discovery/discover-form";

export default function DiscoverPage() {
  const configured = discoveryService.isConfigured();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Discover"
        title="Who are you looking for?"
        description="Describe a market, or enter a company domain, and Reigna will find the people who lead it."
      />

      {configured ? (
        <DiscoverForm />
      ) : (
        <EmptyState
          title="Discovery isn't connected yet."
          description="Connect your discovery provider to begin finding prospects."
          action={<LinkButton href="/settings">View setup status</LinkButton>}
        />
      )}
    </div>
  );
}
