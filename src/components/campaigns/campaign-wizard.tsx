"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Contact, SenderIdentity } from "@/types";
import { Button } from "@/components/ui/button";

export function CampaignWizard({ senders, contacts }: { senders: SenderIdentity[]; contacts: Contact[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [senderIdentityId, setSenderIdentityId] = useState(senders[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [followUpEnabled, setFollowUpEnabled] = useState(true);
  const [followUpDelayDays, setFollowUpDelayDays] = useState(4);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === contacts.length ? new Set() : new Set(contacts.map((c) => c.id))));
  }

  function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Give this campaign a name.");
      return;
    }
    if (selected.size === 0) {
      setError("Select at least one lead.");
      return;
    }
    startTransition(async () => {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          senderIdentityId,
          contactIds: Array.from(selected),
          followUpEnabled,
          followUpDelayDays,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Reigna couldn't create this campaign.");
        return;
      }
      router.push(`/campaigns/${data.campaign.id}`);
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate">Campaign name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Lagos real estate — Q3"
          className="w-full border-b-2 border-border-strong/20 bg-transparent py-2 font-display text-lg text-charcoal placeholder:text-slate/50 focus:border-purple focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate">Sending identity</label>
        <select
          value={senderIdentityId}
          onChange={(e) => setSenderIdentityId(e.target.value)}
          className="w-full border border-border-subtle bg-surface px-3 py-2 text-sm text-charcoal focus:border-purple focus:outline-none"
        >
          {senders.map((sender) => (
            <option key={sender.id} value={sender.id}>
              {sender.mailbox}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate">
            Leads ({selected.size} of {contacts.length} selected)
          </label>
          <button type="button" onClick={toggleAll} className="text-xs font-medium text-purple underline underline-offset-2">
            {selected.size === contacts.length ? "Deselect all" : "Select all"}
          </button>
        </div>
        <div className="max-h-80 divide-y divide-border-subtle overflow-y-auto border border-border-subtle">
          {contacts.map((contact) => (
            <label key={contact.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-muted">
              <input type="checkbox" checked={selected.has(contact.id)} onChange={() => toggle(contact.id)} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-charcoal">{contact.name}</p>
                <p className="truncate text-xs text-slate">
                  {contact.title} · {contact.company}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="followUp"
          checked={followUpEnabled}
          onChange={(e) => setFollowUpEnabled(e.target.checked)}
        />
        <label htmlFor="followUp" className="text-sm text-charcoal">
          Send one follow-up if there&rsquo;s no open after
        </label>
        <input
          type="number"
          min={1}
          max={30}
          value={followUpDelayDays}
          onChange={(e) => setFollowUpDelayDays(Number(e.target.value))}
          disabled={!followUpEnabled}
          className="w-16 border border-border-subtle bg-surface px-2 py-1 text-sm text-charcoal disabled:opacity-50"
        />
        <span className="text-sm text-slate">days</span>
      </div>

      <p className="border-l-2 border-purple/25 bg-surface-muted px-4 py-3 text-xs text-slate">
        Nothing will send until every draft is approved in the review queue, and Reigna will re-check deliverability
        and suppression immediately before launch.
      </p>

      {error ? <p className="text-sm text-status-critical">{error}</p> : null}

      <Button onClick={submit} disabled={pending}>
        {pending ? "Creating campaign…" : "Create campaign & draft messages"}
      </Button>
    </div>
  );
}
