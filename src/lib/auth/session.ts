import "server-only";

import { redirect } from "next/navigation";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { verifyFirebaseSession } from "@/lib/firebase/session";

export async function getOwnerId(): Promise<string | null> {
  if (!isDatabaseConfigured || !prisma) {
    return null;
  }

  const decodedToken = await verifyFirebaseSession();

  if (!decodedToken?.uid) {
    return null;
  }

  /*
   * Resolve the authenticated Firebase identity to the
   * corresponding Reigna owner.
   *
   * Multiple Firebase identities can belong to the same
   * Reigna user, for example:
   *
   *   test@gmail.com
   *     → password
   *
   *   naomiwayabsc@gmail.com
   *     → Google
   *
   * Both resolve to the same User.id.
   */
  const firebaseIdentity =
    await prisma.firebaseIdentity.findUnique({
      where: {
        uid: decodedToken.uid,
      },
      select: {
        userId: true,
      },
    });

  return firebaseIdentity?.userId ?? null;
}

export async function requireOwnerId(): Promise<string> {
  const ownerId = await getOwnerId();

  if (!ownerId) {
    redirect("/login");
  }

  return ownerId;
}