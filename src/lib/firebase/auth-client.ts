"use client";

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  firebaseAuth,
  googleProvider,
} from "@/lib/firebase/client";

async function establishReignaSession(idToken: string) {
  const response = await fetch("/api/auth/firebase/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ idToken }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ?? "Unable to create Reigna session."
    );
  }

  return data;
}

export async function loginWithFirebaseEmail(
  email: string,
  password: string
) {
  const credential = await signInWithEmailAndPassword(
    firebaseAuth,
    email.trim().toLowerCase(),
    password
  );

  const idToken = await credential.user.getIdToken();

  return establishReignaSession(idToken);
}

export async function loginWithGoogle() {
  const credential = await signInWithPopup(
    firebaseAuth,
    googleProvider
  );

  const idToken = await credential.user.getIdToken();

  return establishReignaSession(idToken);
}

export async function logoutFromFirebase() {
  try {
    await fetch("/api/auth/firebase/session", {
      method: "DELETE",
      credentials: "include",
    });
  } finally {
    await signOut(firebaseAuth);
  }
}