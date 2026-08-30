"use server";

import { redirect } from "next/navigation";
import { clearFirebaseSession } from "@/lib/firebase/session";

export interface LoginFormState {
  error?: string;
}

export async function logout() {
  await clearFirebaseSession();
  redirect("/login");
}