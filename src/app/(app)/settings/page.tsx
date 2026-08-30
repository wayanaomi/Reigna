import { isDatabaseConfigured } from "@/lib/db";
import { apifyProvider } from "@/lib/providers/apify";
import { hunterProvider } from "@/lib/providers/hunter";
import { tavilyProvider } from "@/lib/providers/tavily";
import { anthropicProvider } from "@/lib/providers/anthropic";
import { instantlyProvider } from "@/lib/providers/instantly";
import { getMailboxProviderStatus } from "@/lib/services/sending";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";

export default function SettingsPage() {
  const mailboxes = getMailboxProviderStatus();
  const webhookConfigured = Boolean(process.env.INSTANTLY_WEBHOOK_SECRET);

  const integrations: { name: string; description: string; connected: boolean }[] = [
    { name: "Database", description: "PostgreSQL via DATABASE_URL", connected: isDatabaseConfigured },
    { name: "Apify (discovery)", description: "Finds companies matching your search", connected: apifyProvider.isConfigured() },
    { name: "Hunter.io (verification)", description: "Finds and verifies decision-maker emails", connected: hunterProvider.isConfigured() },
    { name: "Tavily (research)", description: "Gathers real public business signals", connected: tavilyProvider.isConfigured() },
    { name: "Anthropic (AI writing)", description: "Synthesizes research and drafts grounded email", connected: anthropicProvider.isConfigured() },
    { name: "Instantly (sending)", description: "Mailbox OAuth, sequencing, and delivery", connected: instantlyProvider.isConfigured() },
    { name: "Webhooks", description: "Receives delivery/open/click/reply events from Instantly", connected: webhookConfigured },
    { name: "Google mailbox OAuth", description: "Lets operators connect a Gmail sending identity", connected: mailboxes.google },
    { name: "Microsoft mailbox OAuth", description: "Lets operators connect an Outlook sending identity", connected: mailboxes.microsoft },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Settings"
        title="Setup status"
        description="What Reigna is connected to right now. Add the corresponding environment variable and restart to connect each one — see .env.example."
      />

      <div className="divide-y divide-border-subtle">
        {integrations.map((integration) => (
          <div key={integration.name} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-medium text-charcoal">{integration.name}</p>
              <p className="text-xs text-slate">{integration.description}</p>
            </div>
            <StatusBadge tone={integration.connected ? "good" : "neutral"}>
              {integration.connected ? "Connected" : "Not connected"}
            </StatusBadge>
          </div>
        ))}
      </div>
    </div>
  );
}
