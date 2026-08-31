import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { verifyFirebaseSession } from "@/lib/firebase/session";

export const getOwnerId = cache(async (): Promise<string | null> => {
  if (!isDatabaseConfigured || !prisma) {
    return null;
  }

  const decodedToken = await verifyFirebaseSession();

  if (!decodedToken?.uid) {
    return null;
  }

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
});

export const requireOwnerId = cache(async (): Promise<string> => {
  const ownerId = await getOwnerId();

  if (!ownerId) {
    redirect("/login");
  }

  return ownerId;
});