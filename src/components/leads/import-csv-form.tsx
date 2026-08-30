"use client";

import { useActionState } from "react";
import Link from "next/link";
import { importCsv, type ImportCsvState } from "@/app/(app)/leads/import/actions";
import { Button } from "@/components/ui/button";

const initialState: ImportCsvState = { submitted: false };

export function ImportCsvForm() {
  const [state, formAction, pending] = useActionState(importCsv, initialState);

  return (
    <div>
      <form action={formAction} className="space-y-4">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="w-full border border-border-subtle bg-surface px-3 py-2 text-sm text-charcoal"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Importing…" : "Import contacts"}
        </Button>
      </form>

      {state.error ? <p className="mt-6 text-sm text-status-critical">{state.error}</p> : null}

      {state.summary ? (
        <div className="mt-8 grid grid-cols-2 gap-px bg-border-subtle sm:grid-cols-3">
          {(
            [
              ["Total rows", state.summary.total],
              ["Imported", state.summary.imported],
              ["Duplicates skipped", state.summary.skippedDuplicate],
              ["Suppressed skipped", state.summary.skippedSuppressed],
              ["Invalid skipped", state.summary.skippedInvalid],
            ] as [string, number][]
          ).map(([label, value]) => (
            <div key={label} className="bg-surface px-5 py-4">
              <p className="font-display text-3xl font-bold text-charcoal">{value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate">{label}</p>
            </div>
          ))}
        </div>
      ) : null}

      {state.summary ? (
        <div className="mt-6">
          <Link href="/leads" className="text-sm font-medium text-purple underline underline-offset-2">
            View your pipeline
          </Link>
        </div>
      ) : null}
    </div>
  );
}
