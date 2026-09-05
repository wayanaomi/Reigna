"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Contact, SenderIdentity } from "@/types";
import { Button } from "@/components/ui/button";

export function CampaignWizard({
  senders,
  contacts,
}: {
  senders: SenderIdentity[];
  contacts: Contact[];
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [senderIdentityId, setSenderIdentityId] = useState(
    senders[0]?.id ?? ""
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [followUpEnabled, setFollowUpEnabled] = useState(true);
  const [followUpDelayDays, setFollowUpDelayDays] = useState(4);

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [timezone] = useState("Africa/Lagos");

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === contacts.length
        ? new Set()
        : new Set(contacts.map((contact) => contact.id))
    );
  }

  function submit() {
    setError(null);

    if (!name.trim()) {
      setError("Give this campaign a name.");
      return;
    }

    if (!senderIdentityId) {
      setError("Select a sending identity.");
      return;
    }

    if (selected.size === 0) {
      setError("Select at least one lead.");
      return;
    }

    let scheduledAt: string | null = null;

    if (scheduleEnabled) {
      if (!scheduledDate) {
        setError("Choose a date for the campaign.");
        return;
      }

      if (!scheduledTime) {
        setError("Choose a time for the campaign.");
        return;
      }

      /*
       * Africa/Lagos is UTC+01:00 and does not observe daylight saving time.
       *
       * The datetime-local inputs represent Lagos wall-clock time, so we
       * explicitly convert that value to UTC before sending it to the API.
       */
      const lagosDateTime = new Date(
        `${scheduledDate}T${scheduledTime}:00+01:00`
      );

      if (Number.isNaN(lagosDateTime.getTime())) {
        setError("Choose a valid schedule date and time.");
        return;
      }

      if (lagosDateTime.getTime() <= Date.now()) {
        setError("Scheduled time must be in the future.");
        return;
      }

      scheduledAt = lagosDateTime.toISOString();
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/campaigns", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            senderIdentityId,
            contactIds: Array.from(selected),

            followUpEnabled,
            followUpDelayDays,

            scheduleEnabled,
            scheduledAt,
            timezone,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(
            data.error ?? "Reigna couldn't create this campaign."
          );
          return;
        }

        router.push(`/campaigns/${data.campaign.id}`);
      } catch {
        setError(
          "Reigna couldn't create this campaign. Check your connection and try again."
        );
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Campaign name */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate">
          Campaign name
        </label>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Lagos real estate — Q3"
          className="w-full border-b-2 border-border-strong/20 bg-transparent py-2 font-display text-lg text-charcoal placeholder:text-slate/50 focus:border-purple focus:outline-none"
        />
      </div>

      {/* Sending identity */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate">
          Sending identity
        </label>

        <select
          value={senderIdentityId}
          onChange={(event) => setSenderIdentityId(event.target.value)}
          className="w-full border border-border-subtle bg-surface px-3 py-2 text-sm text-charcoal focus:border-purple focus:outline-none"
        >
          {senders.map((sender) => (
            <option key={sender.id} value={sender.id}>
              {sender.mailbox}
            </option>
          ))}
        </select>
      </div>

      {/* Leads */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate">
            Leads ({selected.size} of {contacts.length} selected)
          </label>

          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-medium text-purple underline underline-offset-2"
          >
            {selected.size === contacts.length
              ? "Deselect all"
              : "Select all"}
          </button>
        </div>

        <div className="max-h-80 divide-y divide-border-subtle overflow-y-auto border border-border-subtle">
          {contacts.map((contact) => (
            <label
              key={contact.id}
              className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-muted"
            >
              <input
                type="checkbox"
                checked={selected.has(contact.id)}
                onChange={() => toggle(contact.id)}
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-charcoal">
                  {contact.name}
                </p>

                <p className="truncate text-xs text-slate">
                  {contact.title} · {contact.company}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Follow-up */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="followUp"
          checked={followUpEnabled}
          onChange={(event) =>
            setFollowUpEnabled(event.target.checked)
          }
        />

        <label htmlFor="followUp" className="text-sm text-charcoal">
          Send one follow-up if there&rsquo;s no open after
        </label>

        <input
          type="number"
          min={1}
          max={30}
          value={followUpDelayDays}
          onChange={(event) =>
            setFollowUpDelayDays(Number(event.target.value))
          }
          disabled={!followUpEnabled}
          className="w-16 border border-border-subtle bg-surface px-2 py-1 text-sm text-charcoal disabled:opacity-50"
        />

        <span className="text-sm text-slate">days</span>
      </div>

      {/* Scheduling */}
      <div className="border border-border-subtle bg-surface-muted p-4">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">
            Campaign timing
          </p>

          <p className="mt-1 text-sm text-charcoal">
            Choose when Reigna should release this campaign for
            sending.
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="campaignTiming"
              checked={!scheduleEnabled}
              onChange={() => setScheduleEnabled(false)}
              className="mt-1"
            />

            <span>
              <span className="block text-sm font-medium text-charcoal">
                Send when launched
              </span>

              <span className="block text-xs text-slate">
                The campaign will be ready to launch after all
                required messages are approved.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="campaignTiming"
              checked={scheduleEnabled}
              onChange={() => setScheduleEnabled(true)}
              className="mt-1"
            />

            <span>
              <span className="block text-sm font-medium text-charcoal">
                Schedule for later
              </span>

              <span className="block text-xs text-slate">
                Reigna will wait until the scheduled time before
                attempting to launch the campaign.
              </span>
            </span>
          </label>
        </div>

        {scheduleEnabled ? (
          <div className="mt-5 border-t border-border-subtle pt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="scheduledDate"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate"
                >
                  Date
                </label>

                <input
                  id="scheduledDate"
                  type="date"
                  value={scheduledDate}
                  onChange={(event) =>
                    setScheduledDate(event.target.value)
                  }
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full border border-border-subtle bg-surface px-3 py-2 text-sm text-charcoal focus:border-purple focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="scheduledTime"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate"
                >
                  Time
                </label>

                <input
                  id="scheduledTime"
                  type="time"
                  value={scheduledTime}
                  onChange={(event) =>
                    setScheduledTime(event.target.value)
                  }
                  className="w-full border border-border-subtle bg-surface px-3 py-2 text-sm text-charcoal focus:border-purple focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate">
              <span className="font-medium text-charcoal">
                Timezone:
              </span>
              <span>{timezone}</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Safety notice */}
      <p className="border-l-2 border-purple/25 bg-surface-muted px-4 py-3 text-xs text-slate">
        Nothing will send until every draft is approved in the
        review queue, and Reigna will re-check deliverability and
        suppression immediately before launch.
      </p>

      {error ? (
        <p className="text-sm text-status-critical">{error}</p>
      ) : null}

      <Button onClick={submit} disabled={pending}>
        {pending
          ? "Creating campaign…"
          : scheduleEnabled
            ? "Schedule campaign & draft messages"
            : "Create campaign & draft messages"}
      </Button>
    </div>
  );
}