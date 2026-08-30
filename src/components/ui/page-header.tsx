import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-10 border-b border-border-subtle pb-8", className)}>
      {eyebrow ? (
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple">{eyebrow}</p>
          <span aria-hidden className="mt-2 block h-[2px] w-8 bg-gold" />
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold leading-[1.1] text-charcoal">{title}</h1>
          {description ? <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
