"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type InstantlyAccount = {
  email: string;
  warmupEnabled: boolean;
  warmupScore: number | null;
  dailyLimit: number;
  status: unknown;
  statusMessage: string | null;
  bounceRate: number | null;
  domain: string;
};

type Props = {
  onImported?: () => void;
};

function normalizeStatus(status: unknown): string {
  if (typeof status === "string") {
    return status;
  }

  if (status && typeof status === "object") {
    const value = status as {
      status?: unknown;
      name?: unknown;
      value?: unknown;
      label?: unknown;
    };

    for (const candidate of [
      value.status,
      value.name,
      value.value,
      value.label,
    ]) {
      if (typeof candidate === "string") {
        return candidate;
      }
    }
  }

  if (typeof status === "number") {
    return status === 1 ? "active" : String(status);
  }

  return "unknown";
}

export function InstantlyMailboxes({ onImported }: Props) {
  const router = useRouter();

  const [accounts, setAccounts] = useState<InstantlyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<string[]>([]);

  async function loadAccounts() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/mailboxes/instantly", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to load Instantly mailboxes."
        );
      }

      setAccounts(data.items ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Instantly mailboxes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  async function handleImport(email: string) {
    try {
      setImporting(email);
      setError(null);

      const response = await fetch(
        "/api/mailboxes/import/instantly",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to import this mailbox."
        );
      }

      setImported((current) =>
        current.includes(email)
          ? current
          : [...current, email]
      );

      onImported?.();

      /*
       * The Mailboxes page is a Server Component.
       *
       * The import above updates the database successfully, but the
       * server-rendered sender list does not automatically know about
       * that new record. Refresh the server component tree so
       * listSenderIdentities() runs again and displays the imported
       * SenderIdentity.
       */
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to import this mailbox."
      );
    } finally {
      setImporting(null);
    }
  }

  if (loading) {
    return (
      <div className="border border-border-subtle bg-surface px-6 py-5">
        <p className="text-sm text-slate">
          Loading connected Instantly mailboxes…
        </p>
      </div>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <div className="border border-border-subtle bg-surface px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-charcoal">
              Couldn&apos;t load Instantly mailboxes
            </p>

            <p className="mt-1 text-sm text-slate">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAccounts()}
            className="shrink-0 border border-border-subtle px-4 py-2 text-xs font-medium text-charcoal transition hover:bg-surface-muted"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="border border-border-subtle bg-surface px-6 py-5">
        <p className="font-medium text-charcoal">
          No Instantly mailbox found
        </p>

        <p className="mt-1 text-sm text-slate">
          Connect a mailbox in Instantly first, then return here
          to import it into Reigna.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="border border-border-subtle bg-surface px-4 py-3 text-sm text-slate">
          {error}
        </div>
      ) : null}

      {accounts.map((account) => {
        const status = normalizeStatus(account.status);
        const normalizedStatus = status.toLowerCase();

        const isActive =
          normalizedStatus === "active" ||
          normalizedStatus === "connected" ||
          normalizedStatus === "healthy";

        const isImporting =
          importing === account.email;

        const isImported =
          imported.includes(account.email);

        return (
          <div
            key={account.email}
            className="border border-border-subtle bg-surface px-6 py-5"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-display text-lg font-semibold text-charcoal">
                  {account.email}
                </p>

                <p className="mt-1 text-xs text-slate">
                  {account.domain}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={[
                    "inline-flex px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600",
                  ].join(" ")}
                >
                  {status}
                </span>

                <button
                  type="button"
                  disabled={isImporting || isImported}
                  onClick={() =>
                    void handleImport(account.email)
                  }
                  className={[
                    "px-4 py-2 text-xs font-medium transition",
                    isImported
                      ? "cursor-default bg-slate-100 text-slate-500"
                      : "bg-charcoal text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60",
                  ].join(" ")}
                >
                  {isImporting
                    ? "Importing…"
                    : isImported
                      ? "Imported"
                      : "Import to Reigna"}
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-y-3 border-t border-border-subtle pt-4 text-xs sm:grid-cols-4">
              <div>
                <p className="text-slate">
                  Warm-up
                </p>

                <p className="mt-1 text-charcoal">
                  {account.warmupEnabled
                    ? "Enabled"
                    : "Disabled"}
                </p>
              </div>

              <div>
                <p className="text-slate">
                  Warm-up score
                </p>

                <p className="mt-1 text-charcoal">
                  {account.warmupScore ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-slate">
                  Daily limit
                </p>

                <p className="mt-1 text-charcoal">
                  {account.dailyLimit}
                </p>
              </div>

              <div>
                <p className="text-slate">
                  Bounce rate
                </p>

                <p className="mt-1 text-charcoal">
                  {account.bounceRate !== null
                    ? `${account.bounceRate}%`
                    : "—"}
                </p>
              </div>
            </div>

            {account.statusMessage ? (
              <p className="mt-4 text-xs text-slate">
                {account.statusMessage}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}