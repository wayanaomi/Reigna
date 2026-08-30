"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { runResearch, regenerateDraft } from "@/app/(app)/leads/[id]/actions";

export function RunResearchButton({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await runResearch(contactId);
      if (!result.ok) {
        setError(result.error ?? "Reigna couldn't research this contact.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <Button size="sm" variant="secondary" onClick={onClick} disabled={pending}>
        {pending ? "Researching…" : "Run research"}
      </Button>
      {error ? <p className="mt-2 text-sm text-status-critical">{error}</p> : null}
    </div>
  );
}

export function RegenerateDraftButton({ messageId, contactId }: { messageId: string; contactId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await regenerateDraft(messageId, contactId);
      if (!result.ok) {
        setError(result.error ?? "Reigna couldn't regenerate this draft.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <Button size="sm" variant="secondary" onClick={onClick} disabled={pending}>
        {pending ? "Regenerating…" : "Regenerate"}
      </Button>
      {error ? <p className="mt-2 text-sm text-status-critical">{error}</p> : null}
    </div>
  );
}
