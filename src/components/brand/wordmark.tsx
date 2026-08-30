import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Renders the approved Reigna wordmark asset when `logoSrc` is provided
 * (resolved server-side via `resolveWordmarkAsset()` in /src/lib/brand-assets.ts),
 * falling back to a typographic placeholder built from brand tokens
 * otherwise. Per brand guidance: never redraw or approximate the logo with
 * a different typeface for production use — replace the fallback the
 * moment the real asset is added to /public/brand.
 *
 * NOTE: this component must stay free of Node-only imports (fs/path) since
 * it is rendered from client components (SidebarNav/AppShell) — resolve the
 * asset path in a Server Component and pass it down as `logoSrc` instead.
 */
export function Wordmark({
  className,
  tone = "purple",
  logoSrc = null,
}: {
  className?: string;
  tone?: "purple" | "cream";
  logoSrc?: string | null;
}) {
  if (logoSrc) {
    return (
      <Image
        src={logoSrc}
        alt="Reigna"
        width={160}
        height={48}
        className={cn("h-8 w-auto", className)}
        priority
      />
    );
  }

  const textColor = tone === "purple" ? "text-purple" : "text-cream";
  const ruleColor = "bg-gold";

  return (
    <div className={cn("inline-flex flex-col items-center gap-1.5", className)}>
      <span
        className={cn(
          "font-display font-bold tracking-[0.14em] leading-none",
          textColor
        )}
        style={{ fontSize: "1.35rem" }}
      >
        REIGNA
      </span>
      <span className="flex items-center gap-2" aria-hidden>
        <span className={cn("h-px w-6", ruleColor)} />
        <span className={cn("h-1.5 w-1.5 rotate-45", ruleColor)} />
        <span className={cn("h-px w-6", ruleColor)} />
      </span>
    </div>
  );
}

