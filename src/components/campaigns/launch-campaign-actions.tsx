"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

interface LaunchCampaignActionsProps {
  campaignId: string;
  status: string;
}

export function LaunchCampaignActions({ campaignId, status }: LaunchCampaignActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reasons, setReasons] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function launch() {
    setReasons(null);
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/campaigns/${campaignId}/launch`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setReasons(data.reasons ?? null);
        setError(!data.reasons ? "Reigna couldn't launch this campaign." : null);
        return;
      }
      router.refresh();
    });
  }

  function pause() {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/campaigns/${campaignId}/pause`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Reigna couldn't pause this campaign.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        {status === "ACTIVE" ? (
          <Button size="sm" variant="secondary" onClick={pause} disabled={pending}>
            {pending ? "Pausing…" : "Pause campaign"}
          </Button>
        ) : (
          <Button size="sm" onClick={launch} disabled={pending}>
            {pending ? "Launching…" : "Launch campaign"}
          </Button>
        )}
      </div>
      {reasons && reasons.length > 0 ? (
        <div className="mt-3 border-l-2 border-status-critical/40 bg-surface-muted px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-status-critical">Can&rsquo;t launch yet</p>
          <ul className="mt-2 space-y-1 text-sm text-charcoal">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-status-critical">{error}</p> : null}
    </div>
  );
}
