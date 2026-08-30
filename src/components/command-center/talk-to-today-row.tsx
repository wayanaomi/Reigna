import Link from "next/link";
import type { TalkToTodayItem } from "@/types";
import { GoldDiamond } from "@/components/brand/gold-diamond";
import { cn } from "@/lib/utils";

export function TalkToTodayRow({ item, highlight = false }: { item: TalkToTodayItem; highlight?: boolean }) {
  const { contact } = item;
  return (
    <Link
      href={`/leads/${contact.id}`}
      className={cn(
        "-mx-5 flex items-start gap-4 border-l-2 px-5 py-4 transition-colors hover:bg-surface-muted",
        highlight ? "border-gold bg-gold/[0.04]" : "border-transparent hover:border-purple/20"
      )}
    >
      <div className="mt-1.5 shrink-0">
        {highlight ? (
          <GoldDiamond />
        ) : (
          <span className="block h-1.5 w-1.5 rounded-full bg-border-subtle" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-semibold text-charcoal">
          {contact.name}
          <span className="font-sans text-sm font-normal text-slate"> · {contact.title}</span>
        </p>
        <p className="truncate text-sm text-slate">{contact.company}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-charcoal">{item.reason}</p>
        <p className="mt-1.5 text-xs uppercase tracking-wide text-purple">{item.recommendedAction}</p>
      </div>
    </Link>
  );
}
