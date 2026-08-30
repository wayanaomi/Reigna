export function Section({
  title,
  meta,
  index,
  children,
}: {
  title: string;
  meta?: string;
  index?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-border-subtle pb-3">
        <div className="flex items-baseline gap-3">
          {index ? (
            <span className="font-display text-sm font-semibold text-gold-antique">{index}</span>
          ) : null}
          <h2 className="font-display text-xl font-bold text-charcoal">{title}</h2>
        </div>
        {meta ? <span className="text-xs font-medium uppercase tracking-wide text-slate">{meta}</span> : null}
      </div>
      {children}
    </section>
  );
}
