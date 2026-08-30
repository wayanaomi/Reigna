import { cn } from "@/lib/utils";

/**
 * The gold diamond is one of Reigna's most important visual motifs.
 * It signals genuine priority — do not use it decoratively.
 * Reserve it for: highest-priority leads, high-confidence signals,
 * and exceptional reply opportunities.
 */
export function GoldDiamond({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("h-2.5 w-2.5 shrink-0", className)}
      aria-hidden
    >
      <rect
        x="2.5"
        y="2.5"
        width="11"
        height="11"
        rx="1.5"
        transform="rotate(45 8 8)"
        fill="var(--reigna-gold)"
      />
    </svg>
  );
}
