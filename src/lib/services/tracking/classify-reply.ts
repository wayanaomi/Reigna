import { anthropicProvider } from "@/lib/providers/anthropic";
import type { ReplyClassification } from "@/types";

/**
 * Reply classification (see /docs/PRODUCT_DECISIONS.md — section 23).
 *
 * Deterministic keyword rules run first and are preferred whenever they
 * produce a confident match — they're free, instant, and fully
 * explainable. Claude is only consulted for genuinely ambiguous replies,
 * and only when configured; if Claude is unavailable or fails, the reply
 * is still recorded as a REPLIED event with no classification rather than
 * blocking on AI availability.
 */

const OUT_OF_OFFICE_PATTERNS = [
  /out of (the )?office/i,
  /\bOOO\b/,
  /on (annual )?leave/i,
  /currently unavailable/i,
  /will be back (on|in)/i,
];

const AUTO_REPLY_PATTERNS = [/auto[- ]?reply/i, /automatic reply/i, /do not reply to this (email|message)/i];

const NOT_INTERESTED_PATTERNS = [
  /not interested/i,
  /please remove me/i,
  /unsubscribe/i,
  /stop (emailing|contacting) me/i,
  /no thank(s| you)/i,
];

const INTERESTED_PATTERNS = [
  /sounds (great|good|interesting)/i,
  /(let's|lets|would like to|happy to) (chat|talk|connect|schedule|book)/i,
  /tell me more/i,
  /send (me )?(more|additional) (info|information|details)/i,
  /works for me/i,
];

function deterministicClassify(body: string): ReplyClassification | null {
  if (AUTO_REPLY_PATTERNS.some((p) => p.test(body))) return "AUTO_REPLY";
  if (OUT_OF_OFFICE_PATTERNS.some((p) => p.test(body))) return "OUT_OF_OFFICE";
  if (NOT_INTERESTED_PATTERNS.some((p) => p.test(body))) return "NOT_INTERESTED";
  if (INTERESTED_PATTERNS.some((p) => p.test(body))) return "INTERESTED";
  return null;
}

async function claudeClassify(body: string): Promise<ReplyClassification | null> {
  if (!anthropicProvider.isConfigured()) return null;
  try {
    const result = await anthropicProvider.completeJson(
      "You classify a single email reply into exactly one category. Respond with JSON only: " +
        '{"classification": "INTERESTED" | "NOT_INTERESTED" | "OUT_OF_OFFICE" | "AUTO_REPLY"}. ' +
        "Use NOT_INTERESTED for any explicit decline or unsubscribe request.",
      body.slice(0, 4000)
    );
    const value = (result as { classification?: string })?.classification;
    if (value === "INTERESTED" || value === "NOT_INTERESTED" || value === "OUT_OF_OFFICE" || value === "AUTO_REPLY") {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

/** Classifies a reply body. Returns null if no confident classification is possible. */
export async function classifyReply(body: string | null | undefined): Promise<ReplyClassification | null> {
  if (!body) return null;
  const deterministic = deterministicClassify(body);
  if (deterministic) return deterministic;
  return claudeClassify(body);
}
