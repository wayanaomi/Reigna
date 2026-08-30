import { cn } from "@/lib/utils";

type StatusTone = "good" | "warning" | "critical" | "neutral";

const toneText: Record<StatusTone, string> = {
  good: "text-status-good",
  warning: "text-gold-antique",
  critical: "text-status-critical",
  neutral: "text-slate",
};

const toneDot: Record<StatusTone, string> = {
  good: "bg-status-good",
  warning: "bg-gold-antique",
  critical: "bg-status-critical",
  neutral: "bg-slate",
};

/**
 * Sharp, editorial status indicator — a colored dot plus small-caps label.
 * Deliberately not a pill/chip: Reigna avoids decorative badge-everywhere UI.
 */
export function StatusBadge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: StatusTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider",
        toneText[tone],
        className
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", toneDot[tone])} />
      {children}
    </span>
  );
}
