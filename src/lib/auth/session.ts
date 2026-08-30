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

  const user = await prisma.user.findUnique({
    where: {
      firebaseUid: decodedToken.uid,
    },
    select: {
      id: true,
    },
  });

  return user?.id ?? null;
}

export async function requireOwnerId(): Promise<string> {
  const ownerId = await getOwnerId();

  if (!ownerId) {
    redirect("/login");
  }

  return ownerId;
}