import type { DiscoveryResult } from "@/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { AddToReignaButton } from "@/components/discovery/add-to-reigna-button";

function ResultRow({ result }: { result: DiscoveryResult }) {
  return (
    <div className="rounded-sm border border-border-subtle px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-charcoal">
            {result.decisionMaker}
            <span className="font-normal text-slate"> · {result.title}</span>
          </p>
          <p className="truncate text-sm text-slate">{result.company}</p>
        </div>
        <StatusBadge
          tone={
            result.verificationStatus === "VERIFIED"
              ? "good"
              : result.verificationStatus === "RISKY"
                ? "warning"
                : "neutral"
          }
        >
          {result.confidence}% confidence
        </StatusBadge>
      </div>
      <p className="mt-2 text-sm text-charcoal">{result.signal}</p>
      <p className="mt-1 text-xs text-slate">Source: {result.source}</p>
      <div className="mt-3">
        <AddToReignaButton result={result} />
      </div>
    </div>
  );
}

export function DiscoveryResultsList({ items }: { items: DiscoveryResult[] }) {
  const confident = items.filter((r) => r.confidence >= 70);
  const needsReview = items.filter((r) => r.confidence < 70);

  return (
    <div className="space-y-8">
      {confident.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-slate">Ready to review</h3>
          <div className="space-y-2">
            {confident.map((result) => (
              <ResultRow key={result.id} result={result} />
            ))}
          </div>
        </div>
      )}
      {needsReview.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-slate">Needs manual review</h3>
          <div className="space-y-2">
            {needsReview.map((result) => (
              <ResultRow key={result.id} result={result} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
