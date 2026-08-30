"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { DiscoveryResult } from "@/types";
import { Button } from "@/components/ui/button";
import { addToReigna } from "@/app/(app)/discover/actions";

export function AddToReignaButton({ result }: { result: DiscoveryResult }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ contactId: string; alreadyExisted: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const outcome = await addToReigna(result);
      if (!outcome.ok) {
        setError(outcome.error ?? "Reigna couldn't add this contact.");
        return;
      }
      setState({ contactId: outcome.contactId, alreadyExisted: outcome.alreadyExisted });
    });
  }

  if (state) {
    return (
      <Link href={`/leads/${state.contactId}`} className="text-xs font-medium text-purple underline underline-offset-2">
        {state.alreadyExisted ? "Already in Reigna — view lead" : "Added — view lead"}
      </Link>
    );
  }

  return (
    <div>
      <Button size="sm" variant="secondary" onClick={onClick} disabled={pending}>
        {pending ? "Adding…" : "Add to Reigna"}
      </Button>
      {error ? <p className="mt-1 text-xs text-status-critical">{error}</p> : null}
    </div>
  );
}
