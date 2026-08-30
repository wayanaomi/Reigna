import { fetchJson, ProviderError } from "@/lib/providers/http";

/**
 * Hunter.io — contact discovery + verification provider (API v2).
 *
 * Used for: domain search (find people at a company), email finder (guess
 * a specific person's address), email verification (confirm
 * deliverability), and company/person enrichment. All requests happen
 * server-side only — the API key must never reach the browser.
 *
 * Docs: https://hunter.io/api-documentation/v2
 */

const BASE_URL = "https://api.hunter.io/v2";

export interface HunterEmailCandidate {
  value: string;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  seniority: string | null;
  department: string | null;
  confidence: number;
  linkedin: string | null;
}

export interface HunterVerificationResult {
  status: "valid" | "invalid" | "accept_all" | "webmail" | "disposable" | "unknown";
  score: number;
}

export interface HunterCompanyEnrichment {
  name: string | null;
  domain: string | null;
  industry: string | null;
  description: string | null;
  size: string | null;
}

export interface HunterPersonEnrichment {
  fullName: string | null;
  headline: string | null;
  location: string | null;
  linkedin: string | null;
}

function isConfigured(): boolean {
  return Boolean(process.env.HUNTER_API_KEY);
}

function requireKey(): string {
  const key = process.env.HUNTER_API_KEY;
  if (!key) throw new ProviderError("hunter", "Hunter is not configured.");
  return key;
}

function withKey(params: Record<string, string>): string {
  const key = requireKey();
  const search = new URLSearchParams({ ...params, api_key: key });
  return search.toString();
}

interface HunterEmailRow {
  value: string;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
  seniority?: string | null;
  department?: string | null;
  confidence?: number;
  linkedin?: string | null;
}

function toCandidate(row: HunterEmailRow): HunterEmailCandidate {
  return {
    value: row.value,
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    position: row.position ?? null,
    seniority: row.seniority ?? null,
    department: row.department ?? null,
    confidence: row.confidence ?? 0,
    linkedin: row.linkedin ?? null,
  };
}

export const hunterProvider = {
  isConfigured,

  /** Finds people (with roles) associated with a domain. */
  async findContactsForDomain(domain: string): Promise<HunterEmailCandidate[]> {
    const query = withKey({ domain, limit: "20" });
    const data = await fetchJson<{ data: { emails: HunterEmailRow[] } }>(`${BASE_URL}/domain-search?${query}`, {
      provider: "hunter",
      timeoutMs: 15_000,
    });
    return (data.data.emails ?? []).map(toCandidate);
  },

  /** Guesses the email address for a specific named person at a domain. */
  async findEmail(domain: string, firstName: string, lastName: string): Promise<HunterEmailCandidate | null> {
    const query = withKey({ domain, first_name: firstName, last_name: lastName });
    try {
      const data = await fetchJson<{ data: HunterEmailRow }>(`${BASE_URL}/email-finder?${query}`, {
        provider: "hunter",
        timeoutMs: 15_000,
      });
      if (!data.data?.value) return null;
      return toCandidate(data.data);
    } catch (error) {
      if (error instanceof ProviderError && error.status === 404) return null;
      throw error;
    }
  },

  /** Confirms whether a discovered email address is actually deliverable. */
  async verifyEmail(email: string): Promise<HunterVerificationResult> {
    const query = withKey({ email });
    const data = await fetchJson<{ data: { status: HunterVerificationResult["status"]; score: number } }>(
      `${BASE_URL}/email-verifier?${query}`,
      { provider: "hunter", timeoutMs: 15_000 }
    );
    return { status: data.data.status, score: data.data.score };
  },

  /** Enriches a company by domain (name, industry, size, description). */
  async enrichCompany(domain: string): Promise<HunterCompanyEnrichment | null> {
    const query = withKey({ domain });
    try {
      const data = await fetchJson<{
        data: {
          organization?: {
            name?: string | null;
            domain?: string | null;
            industry?: string | null;
            description?: string | null;
            headcount?: string | null;
          };
        };
      }>(`${BASE_URL}/companies/find?${query}`, { provider: "hunter", timeoutMs: 15_000 });
      const org = data.data?.organization;
      if (!org) return null;
      return {
        name: org.name ?? null,
        domain: org.domain ?? null,
        industry: org.industry ?? null,
        description: org.description ?? null,
        size: org.headcount ?? null,
      };
    } catch (error) {
      if (error instanceof ProviderError && error.status === 404) return null;
      throw error;
    }
  },

  /** Enriches a person by email (name, headline, location, LinkedIn). */
  async enrichPerson(email: string): Promise<HunterPersonEnrichment | null> {
    const query = withKey({ email });
    try {
      const data = await fetchJson<{
        data: {
          person?: {
            name?: { fullName?: string | null } | null;
            headline?: string | null;
            location?: string | null;
            linkedin?: { handle?: string | null } | null;
          };
        };
      }>(`${BASE_URL}/people/find?${query}`, { provider: "hunter", timeoutMs: 15_000 });
      const person = data.data?.person;
      if (!person) return null;
      return {
        fullName: person.name?.fullName ?? null,
        headline: person.headline ?? null,
        location: person.location ?? null,
        linkedin: person.linkedin?.handle ?? null,
      };
    } catch (error) {
      if (error instanceof ProviderError && error.status === 404) return null;
      throw error;
    }
  },
};
