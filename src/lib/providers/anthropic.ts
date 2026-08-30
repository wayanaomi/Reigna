import { fetchJson, ProviderError } from "@/lib/providers/http";

/**
 * Anthropic — AI synthesis + writing provider (Messages API).
 *
 * Claude never browses the web itself here — it only synthesizes evidence
 * that Tavily (research) already gathered. Every call requires structured
 * JSON output; the caller is responsible for validating that output with
 * Zod and retrying/failing honestly rather than accepting a malformed or
 * partial response.
 *
 * Docs: https://docs.anthropic.com/en/api/messages
 */

const BASE_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// Centralized default model so it's never scattered across call sites.
// Operators can override via ANTHROPIC_MODEL without a code change.
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function model(): string {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
}

interface AnthropicMessageResponse {
  content: { type: string; text?: string }[];
  stop_reason: string;
}

/**
 * Sends a single-turn message to Claude and returns the raw text response.
 * `system` should instruct Claude to use only supplied evidence and to
 * respond with JSON only (no prose, no markdown fences).
 */
async function complete(system: string, userPrompt: string, maxTokens = 1200): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new ProviderError("anthropic", "Anthropic is not configured.");

  const data = await fetchJson<AnthropicMessageResponse>(BASE_URL, {
    provider: "anthropic",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: model(),
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
    timeoutMs: 30_000,
    maxRetries: 1,
  });

  const text = data.content.find((block) => block.type === "text")?.text;
  if (!text) throw new ProviderError("anthropic", "Anthropic returned an empty response.");
  return text;
}

function extractJson(text: string): unknown {
  // Claude is instructed to return JSON only, but strip markdown fences
  // defensively in case it wraps the response anyway.
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(trimmed);
}

export const anthropicProvider = {
  isConfigured,
  model,

  /**
   * Sends a prompt expecting a JSON response and parses it. Throws if the
   * response isn't valid JSON — callers should retry once (safely, with no
   * side effects) and otherwise surface an honest error rather than
   * fabricate a partial record.
   */
  async completeJson(system: string, userPrompt: string, maxTokens?: number): Promise<unknown> {
    const text = await complete(system, userPrompt, maxTokens);
    return extractJson(text);
  },
};
