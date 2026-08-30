import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "default" | "attention";
  className?: string;
}

/**
 * Shared empty-state primitive. Reigna has no generic "No data found."
 * state — every empty state explains what's true and what the operator can
 * do next. See /docs/PRODUCT_DECISIONS.md for the copy rules governing the
 * three distinct empty states (unconfigured / empty / error).
 */
export function EmptyState({ title, description, action, tone = "default", className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-t-2 bg-surface px-8 py-14",
        tone === "attention" ? "border-t-gold-antique bg-gold/5" : "border-t-purple/25",
        className
      )}
    >
      <p className="font-display text-2xl font-bold text-charcoal">{title}</p>
      {description ? (
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
