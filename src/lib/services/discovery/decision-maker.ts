import type { HunterEmailCandidate } from "@/lib/providers/hunter";

/**
 * Deterministic decision-maker ranking.
 *
 * Given a set of people found at a company (via Hunter's domain search),
 * this module scores and ranks them to identify who Reigna should actually
 * contact. Reigna never blindly picks the first person a provider returns.
 *
 * Scoring model (documented, not tunable via UI in v1):
 *
 *   1. Executive seniority       — up to 40 points (title-based)
 *   2. Owner/founder likelihood  — up to 25 points (title-based bonus)
 *   3. Data completeness         — up to 15 points (name/title/dept present)
 *   4. Email confidence          — up to 20 points (Hunter's 0-100 confidence, scaled)
 *
 * Total score is 0-100. "Company relevance" (criterion 3 in the PRD) is a
 * property of *which company* was searched, not of an individual candidate
 * within it — Reigna already only ranks candidates from the company that
 * matched the operator's search, so relevance is handled upstream in the
 * discovery pipeline rather than duplicated here.
 */

const FOUNDER_OWNER_TITLES = [
  "founder",
  "co-founder",
  "cofounder",
  "owner",
  "managing partner",
  "managing director",
];

const EXECUTIVE_TITLES = [
  "chief executive officer",
  "ceo",
  "director",
  "partner",
  "principal",
  "general manager",
  "head of growth",
  "head of sales",
];

const SENIORITY_WEIGHTS: Record<string, number> = {
  executive: 40,
  senior: 22,
  junior: 8,
};

export interface RankedCandidate {
  candidate: HunterEmailCandidate;
  score: number;
}

function titleMatchesAny(title: string, list: string[]): boolean {
  const normalized = title.toLowerCase();
  return list.some((needle) => normalized.includes(needle));
}

/** Scores a single candidate. Exported for use in tests and audit tooling. */
export function scoreCandidate(candidate: HunterEmailCandidate): number {
  let score = 0;
  const title = candidate.position ?? "";
  const seniority = (candidate.seniority ?? "").toLowerCase();

  // 1. Executive seniority — prefer Hunter's own seniority classification,
  // falling back to matching the title text against a known executive list.
  if (seniority in SENIORITY_WEIGHTS) {
    score += SENIORITY_WEIGHTS[seniority];
  } else if (titleMatchesAny(title, EXECUTIVE_TITLES)) {
    score += SENIORITY_WEIGHTS.executive;
  }

  // 2. Owner/founder likelihood — an explicit bonus on top of seniority,
  // since a Founder/Owner is the strongest possible decision-maker signal
  // regardless of how Hunter classified their seniority band.
  if (titleMatchesAny(title, FOUNDER_OWNER_TITLES)) {
    score += 25;
  }

  // 3. Data completeness — a candidate with a real name and title is far
  // more useful (and more likely to be a real, current employee) than a
  // bare email address.
  let completeness = 0;
  if (candidate.firstName && candidate.lastName) completeness += 8;
  if (candidate.position) completeness += 4;
  if (candidate.department) completeness += 3;
  score += completeness;

  // 4. Email confidence — Hunter's own 0-100 confidence score, scaled down
  // so it contributes meaningfully without dominating seniority signals.
  score += Math.round((candidate.confidence / 100) * 20);

  return Math.min(100, score);
}

/** Ranks candidates highest-score-first. Ties keep Hunter's original order. */
export function rankDecisionMakers(candidates: HunterEmailCandidate[]): RankedCandidate[] {
  return candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(candidate) }))
    .sort((a, b) => b.score - a.score);
}

/** Convenience: the single best decision-maker, or null if the list is empty. */
export function pickDecisionMaker(candidates: HunterEmailCandidate[]): RankedCandidate | null {
  const ranked = rankDecisionMakers(candidates);
  return ranked[0] ?? null;
}
