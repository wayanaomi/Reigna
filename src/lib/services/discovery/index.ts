import type { DiscoveryResult } from "@/types";
import { emptyError, emptyUnconfigured, ok, type ServiceListResult } from "@/lib/services/types";
import { apifyProvider, type NormalizedBusiness } from "@/lib/providers/apify";
import { hunterProvider } from "@/lib/providers/hunter";
import { ProviderError } from "@/lib/providers/http";
import { pickDecisionMaker } from "@/lib/services/discovery/decision-maker";

/**
 * Discovery service boundary — finds companies (Apify) and their most
 * likely decision-maker + email (Hunter) for a natural-language market
 * description.
 *
 * Results are intentionally left `UNVERIFIED` here: verification (and
 * research + persistence) only happens when the operator explicitly adds a
 * candidate to Reigna (see /docs/PRODUCT_DECISIONS.md — discovery →
 * contact creation), so a single search doesn't burn verification credits
 * on candidates the operator never uses.
 */
export interface DiscoveryService {
  isConfigured(): boolean;
  search(query: string): Promise<ServiceListResult<DiscoveryResult>>;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R | null>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = items[index++];
      try {
        const result = await fn(current);
        if (result) results.push(result);
      } catch {
        // Skip individual failures — one bad domain shouldn't fail the whole search.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function toDiscoveryResult(business: NormalizedBusiness): Promise<DiscoveryResult | null> {
  if (!business.domain) return null;

  const candidates = await hunterProvider.findContactsForDomain(business.domain);
  const best = pickDecisionMaker(candidates);
  if (!best || !best.candidate.firstName) return null;

  const fullName = [best.candidate.firstName, best.candidate.lastName].filter(Boolean).join(" ");

  return {
    id: `${business.domain}:${best.candidate.value}`,
    company: business.company,
    companyDomain: business.domain,
    companyAddress: business.address ?? undefined,
    companyPhone: business.phone ?? undefined,
    companyCategory: business.category ?? undefined,
    decisionMaker: fullName || best.candidate.value,
    title: best.candidate.position ?? "",
    email: best.candidate.value,
    confidence: Math.round((best.score + best.candidate.confidence) / 2),
    verificationStatus: "UNVERIFIED",
    signal: business.category ? `${business.category} · ${business.address ?? "location unknown"}` : business.address ?? "",
    source: business.sourceUrl ?? `https://${business.domain}`,
  };
}

class LiveDiscoveryService implements DiscoveryService {
  isConfigured(): boolean {
    return apifyProvider.isConfigured() && hunterProvider.isConfigured();
  }

  async search(query: string): Promise<ServiceListResult<DiscoveryResult>> {
    if (!this.isConfigured()) return emptyUnconfigured();

    let businesses: NormalizedBusiness[];
    try {
      businesses = await apifyProvider.searchBusinesses(query);
    } catch (error) {
      const message = error instanceof ProviderError ? error.message : "Reigna couldn't complete the market search.";
      return emptyError(message);
    }

    if (businesses.length === 0) return ok([]);

    const results = await mapWithConcurrency(businesses, 5, toDiscoveryResult);
    return ok(results);
  }
}

export const discoveryService: DiscoveryService = new LiveDiscoveryService();

