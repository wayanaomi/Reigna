"use client";

import { useActionState } from "react";
import { searchDiscovery, type DiscoverSearchState } from "@/app/(app)/discover/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DiscoveryResultsList } from "@/components/discovery/results-list";

const initialState: DiscoverSearchState = { query: "", items: [], submitted: false };

export function DiscoverForm() {
  const [state, formAction, pending] = useActionState(searchDiscovery, initialState);

  return (
    <div>
      <form action={formAction} className="space-y-4">
        <label htmlFor="query" className="sr-only">
          Describe who you&rsquo;re looking for
        </label>
        <textarea
          id="query"
          name="query"
          rows={2}
          placeholder="Real estate agencies in Lagos with 5+ agents"
          defaultValue={state.query}
          className="w-full resize-none border-b-2 border-border-strong/20 bg-transparent py-3 font-display text-xl text-charcoal placeholder:text-slate/50 focus:border-purple focus:outline-none"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Searching…" : "Find prospects"}
        </Button>
      </form>

      {state.submitted ? (
        <div className="mt-10">
          {state.error ? (
            <EmptyState title="Reigna couldn't complete this search." description={state.error} tone="attention" />
          ) : state.items.length === 0 ? (
            <EmptyState
              title="No matches yet."
              description="Try a broader or more specific description of who you're looking for."
            />
          ) : (
            <DiscoveryResultsList items={state.items} />
          )}
        </div>
      ) : null}
    </div>
  );
}
