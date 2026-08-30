import "server-only";

import { cookies } from "next/headers";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

const SESSION_COOKIE_NAME = "reigna_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 5;

export async function createFirebaseSession(idToken: string) {
  const auth = getFirebaseAdminAuth();

  const decodedToken = await auth.verifyIdToken(idToken);

  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS,
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });

  return decodedToken;
}

export async function clearFirebaseSession() {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getFirebaseSessionCookie() {
  const cookieStore = await cookies();

  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function verifyFirebaseSession() {
  const sessionCookie = await getFirebaseSessionCookie();

  if (!sessionCookie) {
    return null;
  }

  try {
    return await getFirebaseAdminAuth().verifySessionCookie(
      sessionCookie,
      true
    );
  } catch {
    return null;
  }
}