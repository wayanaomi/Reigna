"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerId } from "@/lib/auth/session";
import { reviewService } from "@/lib/services/review";
import { regenerateMessage } from "@/lib/services/pipeline";

export async function approveMessage(messageId: string) {
  const ownerId = await requireOwnerId();
  await reviewService.approve(ownerId, messageId);
  revalidatePath("/review");
  revalidatePath("/");
}

export async function rejectMessage(messageId: string) {
  const ownerId = await requireOwnerId();
  await reviewService.reject(ownerId, messageId);
  revalidatePath("/review");
  revalidatePath("/");
}

export async function updateMessageContent(messageId: string, subject: string, body: string) {
  const ownerId = await requireOwnerId();
  await reviewService.updateContent(ownerId, messageId, { subject, body });
  revalidatePath("/review");
  return { ok: true };
}

export async function regenerateDraft(messageId: string) {
  const ownerId = await requireOwnerId();
  const result = await regenerateMessage(ownerId, messageId);
  revalidatePath("/review");
  return result;
}
