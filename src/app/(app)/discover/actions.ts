"use server";

import { discoveryService } from "@/lib/services/discovery";
import type { DiscoveryResult } from "@/types";
import { requireOwnerId } from "@/lib/auth/session";
import { addDiscoveryCandidateToReigna } from "@/lib/services/pipeline";

export interface DiscoverSearchState {
  query: string;
  items: DiscoveryResult[];
  error?: string;
  submitted: boolean;
}

export async function searchDiscovery(
  _prevState: DiscoverSearchState,
  formData: FormData
): Promise<DiscoverSearchState> {
  const query = String(formData.get("query") ?? "").trim();
  if (!query) {
    return { query: "", items: [], submitted: false };
  }

  const result = await discoveryService.search(query);
  return { query, items: result.items, error: result.error, submitted: true };
}

export async function addToReigna(candidate: DiscoveryResult) {
  const ownerId = await requireOwnerId();
  const result = await addDiscoveryCandidateToReigna(ownerId, {
    company: candidate.company,
    companyDomain: candidate.companyDomain,
    companyAddress: candidate.companyAddress,
    companyPhone: candidate.companyPhone,
    companyCategory: candidate.companyCategory,
    decisionMaker: candidate.decisionMaker,
    title: candidate.title,
    email: candidate.email,
    confidence: candidate.confidence,
    source: candidate.source,
  });
  if ("error" in result) return { ok: false as const, error: result.error };
  return { ok: true as const, contactId: result.contactId, alreadyExisted: result.alreadyExisted };
}
