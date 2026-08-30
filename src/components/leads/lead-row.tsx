import Link from "next/link";
import type { Contact } from "@/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { GoldDiamond } from "@/components/brand/gold-diamond";

function verificationTone(status: Contact["verificationStatus"]) {
  switch (status) {
    case "VERIFIED":
      return "good" as const;
    case "RISKY":
      return "warning" as const;
    case "INVALID":
      return "critical" as const;
    default:
      return "neutral" as const;
  }
}

export function LeadRow({ contact }: { contact: Contact }) {
  return (
    <Link
      href={`/leads/${contact.id}`}
      className="-mx-5 flex items-center justify-between gap-4 border-l-2 border-transparent px-5 py-4 transition-colors hover:border-purple/25 hover:bg-surface-muted"
    >
      <div className="flex min-w-0 items-center gap-3">
        {contact.engagementScore >= 85 ? <GoldDiamond /> : null}
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold text-charcoal">
            {contact.name}
            <span className="font-sans text-sm font-normal text-slate"> · {contact.title}</span>
          </p>
          <p className="truncate text-sm text-slate">{contact.company}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="hidden text-xs text-slate sm:inline">Score {contact.engagementScore}</span>
        <StatusBadge tone={verificationTone(contact.verificationStatus)}>
          {contact.verificationStatus.toLowerCase()}
        </StatusBadge>
      </div>
    </Link>
  );
}
