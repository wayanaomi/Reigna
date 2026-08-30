import { fetchJson, ProviderError } from "@/lib/providers/http";

/**
 * Tavily — real web research provider.
 *
 * This is Reigna's only source of research "evidence". The AI synthesis
 * layer (Anthropic) is never allowed to invent facts — it only summarizes
 * what Tavily actually returned. Every `TavilySearchResult.url` is a real
 * URL returned by the provider; Reigna never constructs or guesses one.
 *
 * Docs: https://docs.tavily.com/documentation/api-reference/endpoint/search
 */

const BASE_URL = "https://api.tavily.com/search";

export interface TavilySearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedAt: string | null;
  score: number;
}

function isConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}

interface TavilyResponse {
  results: { title: string; url: string; content: string; score: number; published_date?: string | null }[];
}

async function search(query: string, maxResults: number): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new ProviderError("tavily", "Tavily is not configured.");

  const data = await fetchJson<TavilyResponse>(BASE_URL, {
    provider: "tavily",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      max_results: maxResults,
      include_answer: false,
    }),
    timeoutMs: 25_000,
    maxRetries: 1,
  });

  return (data.results ?? []).map((row) => ({
    title: row.title,
    url: row.url,
    snippet: row.content,
    publishedAt: row.published_date ?? null,
    score: row.score,
  }));
}

export const tavilyProvider = {
  isConfigured,

  /** Researches a company by its domain (site-scoped where possible). */
  async researchDomain(domain: string): Promise<TavilySearchResult[]> {
    return search(`${domain} company overview news`, 5);
  },

  /** Researches a company by name (broader than the domain-scoped search). */
  async researchCompanyName(companyName: string): Promise<TavilySearchResult[]> {
    return search(`"${companyName}" company recent news announcements`, 5);
  },

  /** Researches a specific decision-maker by name and company. */
  async researchPerson(personName: string, companyName: string): Promise<TavilySearchResult[]> {
    return search(`"${personName}" "${companyName}"`, 4);
  },

  /** Searches for recent, relevant business signals (expansion, hiring, funding, etc). */
  async researchBusinessSignals(companyName: string): Promise<TavilySearchResult[]> {
    return search(`${companyName} expansion hiring funding new location announcement`, 4);
  },
};
