"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  loginWithFirebaseEmail,
  loginWithGoogle,
} from "@/lib/firebase/auth-client";
import { createOwnerAccount, type LoginFormState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

const initialState: LoginFormState = {};

const inputClasses =
  "w-full rounded-sm border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-cream placeholder:text-cream/35 focus:border-gold focus:outline-none focus:ring-0";

export function LoginForm({
  mode,
}: {
  mode: "signin" | "bootstrap";
}) {
  const router = useRouter();

  const [state, setState] =
    useState<LoginFormState>(initialState);

  const [pending, setPending] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (mode === "bootstrap") {
      // Keep the existing bootstrap flow available until
      // the Firebase migration is fully complete.
      const formData = new FormData(event.currentTarget);

      setPending(true);

      try {
        const result = await createOwnerAccount(
          initialState,
          formData
        );

        setState(result);
      } finally {
        setPending(false);
      }

      return;
    }

    const formData = new FormData(event.currentTarget);

    const email = String(
      formData.get("email") ?? ""
    ).trim();

    const password = String(
      formData.get("password") ?? ""
    );

    setPending(true);
    setState({});

    try {
      await loginWithFirebaseEmail(
        email,
        password
      );

      router.replace("/");
      router.refresh();
    } catch (error) {
      setState({
        error:
          error instanceof Error
            ? getFirebaseLoginError(error)
            : "Unable to sign in.",
      });
    } finally {
      setPending(false);
    }
  }

  async function handleGoogleLogin() {
    setPending(true);
    setState({});

    try {
      await loginWithGoogle();

      router.replace("/");
      router.refresh();
    } catch (error) {
      setState({
        error:
          error instanceof Error
            ? getFirebaseLoginError(error)
            : "Unable to continue with Google.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-antique">
          {mode === "bootstrap"
            ? "Create your owner account"
            : "Sign in"}
        </p>

        {mode === "bootstrap" ? (
          <div>
            <label
              className="mb-1.5 block text-xs text-cream/60"
              htmlFor="name"
            >
              Name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              className={inputClasses}
            />
          </div>
        ) : null}

        <div>
          <label
            className="mb-1.5 block text-xs text-cream/60"
            htmlFor="email"
          >
            Email
          </label>

          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClasses}
          />
        </div>

        <div>
          <label
            className="mb-1.5 block text-xs text-cream/60"
            htmlFor="password"
          >
            Password
          </label>

          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={
              mode === "bootstrap"
                ? 8
                : undefined
            }
            autoComplete={
              mode === "bootstrap"
                ? "new-password"
                : "current-password"
            }
            className={inputClasses}
          />
        </div>

        {state.error ? (
          <p className="text-xs text-status-critical">
            {state.error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="w-full"
        >
          {pending
            ? "Please wait…"
            : mode === "bootstrap"
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      {mode === "signin" ? (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] uppercase tracking-[0.14em] text-cream/35">
              Or
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={handleGoogleLogin}
            className="w-full"
          >
            Continue with Google
          </Button>
        </>
      ) : null}
    </div>
  );
}

function getFirebaseLoginError(
  error: Error
): string {
  const code =
    "code" in error
      ? String(
          (error as Error & { code?: string })
            .code ?? ""
        )
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";

    case "auth/too-many-requests":
      return "Too many sign-in attempts. Please try again later.";

    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";

    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in window.";

    default:
      return error.message || "Unable to sign in.";
  }
}