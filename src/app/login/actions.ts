"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { signIn } from "@/lib/auth/auth";
import { AuthError } from "next-auth";

export interface LoginFormState {
  error?: string;
}

/**
 * One-time bootstrap: creates Reigna's single owner account. Only succeeds
 * while zero User rows exist — there is no ongoing public sign-up surface.
 */
export async function createOwnerAccount(_prev: LoginFormState, formData: FormData): Promise<LoginFormState> {
  if (!isDatabaseConfigured || !prisma) {
    return { error: "No database connection. Set DATABASE_URL before creating an account." };
  }

  const existing = await prisma.user.count();
  if (existing > 0) {
    return { error: "An owner account already exists." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim() || undefined;

  if (!email || !email.includes("@")) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email, passwordHash, name } });

  await signIn("credentials", { email, password, redirectTo: "/" });
  return {};
}

export async function loginWithCredentials(_prev: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Incorrect email or password." };
    }
    // NextAuth throws a redirect internally on success — re-throw so Next.js can handle it.
    throw error;
  }
}

export async function logout() {
  const { signOut } = await import("@/lib/auth/auth");
  await signOut({ redirectTo: "/login" });
  redirect("/login");
}
