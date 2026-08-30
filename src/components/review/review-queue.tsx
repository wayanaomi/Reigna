"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Contact, Message } from "@/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { approveMessage, rejectMessage, updateMessageContent, regenerateDraft } from "@/app/(app)/review/actions";

export interface ReviewQueueItem {
  message: Message;
  contact: Contact | undefined;
}

export function ReviewQueue({ items }: { items: ReviewQueueItem[] }) {
  const [selectedId, setSelectedId] = useState(items[0]?.message.id ?? null);
  const selected = items.find((item) => item.message.id === selectedId) ?? items[0];

  if (!selected) return null;

  return (
    <div className="grid grid-cols-1 gap-px bg-border-subtle lg:grid-cols-[260px_1fr_260px]">
      <div className="max-h-[70vh] overflow-y-auto bg-surface">
        {items.map(({ message, contact }) => (
          <button
            key={message.id}
            type="button"
            onClick={() => setSelectedId(message.id)}
            className={`block w-full border-l-2 px-4 py-3 text-left transition-colors ${
              message.id === selected.message.id
                ? "border-purple bg-purple/5"
                : "border-transparent hover:bg-surface-muted"
            }`}
          >
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-purple">
              {contact ? `${contact.name}` : "Unknown contact"}
            </p>
            <p className="mt-1 truncate text-sm text-charcoal">{message.subject}</p>
            {contact ? <p className="truncate text-xs text-slate">{contact.company}</p> : null}
          </button>
        ))}
      </div>

      <MessageEditor key={selected.message.id} item={selected} />

      <div className="bg-surface px-4 py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate">Research basis</p>
        {selected.message.researchBasis ? (
          <p className="text-sm italic leading-relaxed text-slate">{selected.message.researchBasis}</p>
        ) : (
          <p className="text-sm text-slate">No research basis recorded for this draft.</p>
        )}
        {selected.contact?.researchSignals && selected.contact.researchSignals.length > 0 ? (
          <div className="mt-5 space-y-3 border-t border-border-subtle pt-4">
            {selected.contact.researchSignals.map((signal, index) => (
              <div key={index}>
                <p className="text-sm font-semibold text-charcoal">{signal.label}</p>
                <p className="mt-0.5 text-xs text-slate">{signal.detail}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate/70">Source: {signal.source}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function messageTone(status: string) {
  if (status === "NEEDS_REVIEW") return "warning" as const;
  if (status === "SENT" || status === "FOLLOWED_UP" || status === "APPROVED" || status === "QUEUED") return "good" as const;
  if (status === "REJECTED" || status === "FAILED") return "critical" as const;
  return "neutral" as const;
}

function MessageEditor({ item }: { item: ReviewQueueItem }) {
  const router = useRouter();
  const { message, contact } = item;
  const [subject, setSubject] = useState(message.subject);
  const [body, setBody] = useState(message.body);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      await updateMessageContent(message.id, subject, body);
      setDirty(false);
      router.refresh();
    });
  }

  function approve() {
    setError(null);
    startTransition(async () => {
      await approveMessage(message.id);
      router.refresh();
    });
  }

  function reject() {
    setError(null);
    startTransition(async () => {
      await rejectMessage(message.id);
      router.refresh();
    });
  }

  function regenerate() {
    setError(null);
    startTransition(async () => {
      const result = await regenerateDraft(message.id);
      if (!result.ok) {
        setError(result.error ?? "Reigna couldn't regenerate this draft.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="bg-surface px-6 py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-purple">
          {contact ? `${contact.name} · ${contact.company}` : "Unknown contact"}
        </p>
        <StatusBadge tone={messageTone(message.status)}>{message.status.replace("_", " ").toLowerCase()}</StatusBadge>
      </div>

      <input
        value={subject}
        onChange={(e) => {
          setSubject(e.target.value);
          setDirty(true);
        }}
        className="w-full border-b-2 border-border-strong/20 bg-transparent pb-2 font-display text-xl font-bold text-charcoal focus:border-purple focus:outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setDirty(true);
        }}
        rows={14}
        className="mt-4 w-full resize-none bg-transparent text-[15px] leading-relaxed text-charcoal focus:outline-none"
      />

      {error ? <p className="mt-2 text-sm text-status-critical">{error}</p> : null}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-border-subtle pt-5">
        <Button size="sm" onClick={approve} disabled={pending}>
          Approve
        </Button>
        <Button size="sm" variant="destructive" onClick={reject} disabled={pending}>
          Reject
        </Button>
        <Button size="sm" variant="secondary" onClick={regenerate} disabled={pending}>
          {pending ? "Working…" : "Regenerate"}
        </Button>
        {dirty ? (
          <Button size="sm" variant="secondary" onClick={save} disabled={pending}>
            Save edits
          </Button>
        ) : null}
      </div>
    </div>
  );
}
