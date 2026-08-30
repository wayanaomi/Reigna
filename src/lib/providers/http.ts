/**
 * Shared HTTP helper for all external provider integrations (Apify, Hunter,
 * Tavily, Anthropic, Instantly).
 *
 * Every external call in Reigna must go through this helper so that
 * timeouts, retries, and error normalization are handled consistently.
 * Never call `fetch` directly against a provider from a service module.
 */

export class ProviderError extends Error {
  readonly provider: string;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(provider: string, message: string, options?: { status?: number; retryable?: boolean }) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.status = options?.status;
    this.retryable = options?.retryable ?? false;
  }
}

interface FetchJsonOptions extends RequestInit {
  provider: string;
  timeoutMs?: number;
  maxRetries?: number;
}

function isRetryableStatus(status: number): boolean {
  // Retry on rate limiting and transient server errors only — never on
  // 4xx validation failures, which will fail identically on retry.
  return status === 429 || status >= 500;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Performs a JSON HTTP request with an explicit timeout and bounded,
 * exponential-backoff retries. Throws `ProviderError` on failure — callers
 * must catch this and map it to Reigna's own honest error language, never
 * surfacing raw provider internals to the end user.
 */
export async function fetchJson<T>(url: string, init: FetchJsonOptions): Promise<T> {
  const { provider, timeoutMs = 15_000, maxRetries = 2, ...requestInit } = init;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...requestInit, signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        const retryable = isRetryableStatus(response.status);
        if (retryable && attempt < maxRetries) {
          await sleep(2 ** attempt * 400);
          continue;
        }
        throw new ProviderError(provider, `${provider} request failed (${response.status}): ${bodyText.slice(0, 300)}`, {
          status: response.status,
          retryable,
        });
      }

      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (error instanceof ProviderError) {
        if (!error.retryable || attempt >= maxRetries) throw error;
      } else if (error instanceof DOMException && error.name === "AbortError") {
        if (attempt >= maxRetries) {
          throw new ProviderError(provider, `${provider} request timed out.`, { retryable: true });
        }
      } else if (attempt >= maxRetries) {
        throw new ProviderError(provider, `${provider} request failed: ${(error as Error).message}`, {
          retryable: false,
        });
      }
      await sleep(2 ** attempt * 400);
    }
  }
  throw lastError instanceof Error ? lastError : new ProviderError(provider, "Unknown provider error.");
}
