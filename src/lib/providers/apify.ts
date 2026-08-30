import { fetchJson, ProviderError } from "@/lib/providers/http";

/**
 * Apify — business/company discovery provider.
 *
 * Reigna calls the configured Actor synchronously via Apify's
 * `run-sync-get-dataset-items` endpoint (avoids managing our own polling
 * loop) and normalizes whatever shape that Actor's dataset returns into a
 * small, stable `RawBusiness` shape. The Actor ID is fully configurable
 * (`APIFY_DISCOVERY_ACTOR_ID`) — nothing here hard-codes assumptions that
 * would break if the operator swaps to a different scraper Actor, beyond
 * the default input shape used for the out-of-the-box
 * `compass/crawler-google-places` Actor.
 *
 * Docs: https://docs.apify.com/api/v2/act-run-sync-get-dataset-items-post
 */

export interface RawBusiness {
  /** Every field the underlying Actor might have returned, kept for normalization. */
  [key: string]: unknown;
}

export interface NormalizedBusiness {
  company: string;
  domain: string | null;
  address: string | null;
  phone: string | null;
  category: string | null;
  sourceUrl: string | null;
}

function isConfigured(): boolean {
  return Boolean(process.env.APIFY_API_TOKEN);
}

function actorPath(): string {
  const actorId = process.env.APIFY_DISCOVERY_ACTOR_ID || "compass/crawler-google-places";
  return actorId.replace(/\//g, "~");
}

function maxResults(): number {
  const parsed = Number(process.env.APIFY_MAX_RESULTS);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 100) : 20;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function extractDomain(...candidates: unknown[]): string | null {
  const raw = firstString(...candidates);
  if (!raw) return null;
  try {
    const withScheme = raw.startsWith("http") ? raw : `https://${raw}`;
    const host = new URL(withScheme).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Normalizes a single raw Actor dataset item into a stable business record.
 * Different Actors label the same concept differently (e.g. `title` vs
 * `name` vs `companyName`), so every field is resolved from a list of
 * plausible aliases rather than a single hard-coded key.
 */
export function normalizeBusiness(raw: RawBusiness): NormalizedBusiness | null {
  const company = firstString(raw.title, raw.name, raw.companyName, raw.company);
  if (!company) return null;

  const website = firstString(raw.website, raw.domain, raw.url, raw.webUrl);
  const domain = extractDomain(website);

  const address = firstString(
    raw.address,
    raw.fullAddress,
    (raw.location as { address?: string } | undefined)?.address,
    raw.formattedAddress
  );

  const phone = firstString(raw.phone, raw.phoneNumber, raw.internationalPhoneNumber, raw.phoneUnformatted);

  const category = firstString(
    raw.categoryName,
    raw.category,
    Array.isArray(raw.categories) ? (raw.categories as unknown[])[0] : undefined
  );

  const sourceUrl = firstString(raw.url, raw.googleMapsUrl, raw.link, website);

  return { company, domain, address, phone, category, sourceUrl };
}

/** Deduplicates normalized businesses, preferring domain when available. */
export function dedupeBusinesses(items: NormalizedBusiness[]): NormalizedBusiness[] {
  const seen = new Set<string>();
  const result: NormalizedBusiness[] = [];
  for (const item of items) {
    const key = (item.domain ?? `${item.company}::${item.address ?? ""}`).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export const apifyProvider = {
  isConfigured,

  /**
   * Runs the configured discovery Actor with a natural-language query and
   * returns normalized, deduplicated business candidates. Throws
   * `ProviderError` on failure — callers must map this to Reigna's own
   * honest error language.
   */
  async searchBusinesses(query: string): Promise<NormalizedBusiness[]> {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) throw new ProviderError("apify", "Apify is not configured.");

    const url = `https://api.apify.com/v2/acts/${actorPath()}/run-sync-get-dataset-items?token=${encodeURIComponent(
      token
    )}&format=json`;

    const input = {
      searchStringsArray: [query],
      maxCrawledPlacesPerSearch: maxResults(),
      language: "en",
    };

    const items = await fetchJson<RawBusiness[]>(url, {
      provider: "apify",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      timeoutMs: 60_000,
      maxRetries: 1,
    });

    const normalized = items.map(normalizeBusiness).filter((b): b is NormalizedBusiness => b !== null);
    return dedupeBusinesses(normalized).slice(0, maxResults());
  },
};
