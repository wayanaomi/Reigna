"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerId } from "@/lib/auth/session";
import { reviewService } from "@/lib/services/review";
import { researchService } from "@/lib/services/research";
import { regenerateMessage } from "@/lib/services/pipeline";

export async function approveMessage(messageId: string, contactId: string) {
  const ownerId = await requireOwnerId();
  await reviewService.approve(ownerId, messageId);
  revalidatePath(`/leads/${contactId}`);
}

export async function rejectMessage(messageId: string, contactId: string) {
  const ownerId = await requireOwnerId();
  await reviewService.reject(ownerId, messageId);
  revalidatePath(`/leads/${contactId}`);
}

export async function runResearch(contactId: string) {
  const ownerId = await requireOwnerId();
  const outcome = await researchService.researchContact(ownerId, contactId);
  revalidatePath(`/leads/${contactId}`);
  if (!outcome.configured || outcome.error) {
    return { ok: false, error: outcome.error ?? "Research is not configured." };
  }
  return { ok: true };
}

export async function regenerateDraft(messageId: string, contactId: string) {
  const ownerId = await requireOwnerId();
  const result = await regenerateMessage(ownerId, messageId);
  revalidatePath(`/leads/${contactId}`);
  return result;
}
