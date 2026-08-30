"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

import {
  loginWithFirebaseEmail,
  loginWithGoogle,
} from "@/lib/firebase/auth-client";

import {
  createOwnerAccount,
  type LoginFormState,
} from "@/app/login/actions";

import { Button } from "@/components/ui/button";

const initialState: LoginFormState = {};

const inputClasses = [
  "w-full rounded-sm",
  "border border-charcoal/12",
  "bg-white px-4 py-3",
  "text-sm text-charcoal",
  "placeholder:text-slate/45",
  "shadow-[inset_0_1px_2px_rgba(26,26,26,0.03)]",
  "transition-all duration-200",
  "focus:border-purple",
  "focus:bg-white",
  "focus:outline-none",
  "focus:ring-2",
  "focus:ring-purple/10",
].join(" ");

export function LoginForm({
  mode,
}: {
  mode: "signin" | "bootstrap";
}) {
  const router = useRouter();

  const [state, setState] =
    useState<LoginFormState>(initialState);

  const [pending, setPending] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const formData =
      new FormData(event.currentTarget);

    if (mode === "bootstrap") {
      setPending(true);

      try {
        const result =
          await createOwnerAccount(
            initialState,
            formData
          );

        setState(result);
      } finally {
        setPending(false);
      }

      return;
    }

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
    <div className="relative">
      {/* Small architectural accent behind the card */}
      <div
        aria-hidden="true"
        className="absolute -right-2 -top-2 h-16 w-16 border-r border-t border-gold/50"
      />

      <div
        aria-hidden="true"
        className="absolute -bottom-2 -left-2 h-16 w-16 border-b border-l border-gold/25"
      />

      <div className="relative overflow-hidden rounded-md border border-white/70 bg-cream p-7 shadow-[0_24px_70px_rgba(18,8,31,0.28)] sm:p-8">
        {/* restrained gold line */}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-0 h-px bg-gold"
        />

        <div className="mb-7">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gold-antique">
            {mode === "bootstrap"
              ? "Account setup"
              : "Private workspace"}
          </p>

          <h1 className="font-display text-2xl tracking-[-0.02em] text-purple-deep">
            {mode === "bootstrap"
              ? "Create your owner account"
              : "Welcome back"}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate">
            {mode === "bootstrap"
              ? "Set up the account that controls your Reigna workspace."
              : "Sign in to continue to your Reigna workspace."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {mode === "bootstrap" ? (
            <div>
              <label
                className="mb-2 block text-xs font-medium text-charcoal"
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
              className="mb-2 block text-xs font-medium text-charcoal"
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
              placeholder="you@company.com"
              className={inputClasses}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                className="block text-xs font-medium text-charcoal"
                htmlFor="password"
              >
                Password
              </label>
            </div>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
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
                className={`${inputClasses} pr-11`}
              />

              <button
                type="button"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                aria-pressed={showPassword}
                onClick={() =>
                  setShowPassword(
                    (value) => !value
                  )
                }
                className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-slate/55 transition-colors hover:text-purple focus:outline-none focus-visible:text-purple"
              >
                {showPassword ? (
                  <EyeOff size={17} strokeWidth={1.8} />
                ) : (
                  <Eye size={17} strokeWidth={1.8} />
                )}
              </button>
            </div>
          </div>

          {state.error ? (
            <div
              role="alert"
              className="border-l-2 border-status-critical bg-status-critical/5 px-3 py-2.5 text-xs leading-5 text-status-critical"
            >
              {state.error}
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="h-12 w-full text-[13px] font-semibold tracking-wide"
          >
            {pending ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin"
                />
                Please wait…
              </>
            ) : mode === "bootstrap" ? (
              "Create account"
            ) : (
              "Sign in to Reigna"
            )}
          </Button>
        </form>

        {mode === "signin" ? (
          <div className="mt-6">
            <div className="relative flex items-center">
              <div className="h-px flex-1 bg-charcoal/10" />

              <span className="mx-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate/45">
                Or continue with
              </span>

              <div className="h-px flex-1 bg-charcoal/10" />
            </div>

            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={handleGoogleLogin}
              className="mt-5 h-12 w-full border-charcoal/12 bg-white font-medium"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </Button>
          </div>
        ) : null}

        <div className="mt-7 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.14em] text-slate/40">
          <span className="h-1 w-1 rounded-full bg-gold" />
          <span>Reigna</span>
          <span>•</span>
          <span>Outbound intelligence</span>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.23a4.46 4.46 0 0 1-1.94 2.92v2.42h3.14c1.84-1.69 2.92-4.18 2.92-7.37Z"
      />
      <path
        fill="#34A853"
        d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.42c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.29v2.5A9.74 9.74 0 0 0 12 21.5Z"
      />
      <path
        fill="#FBBC05"
        d="M6.53 13.61A5.86 5.86 0 0 1 6.22 12c0-.56.1-1.1.31-1.61v-2.5H3.29A9.74 9.74 0 0 0 2.25 12c0 1.57.38 3.05 1.04 4.39l3.24-2.78Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.36c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.43 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.71 5.39l3.24 2.5C7.3 8.08 9.46 6.36 12 6.36Z"
      />
    </svg>
  );
}

function getFirebaseLoginError(
  error: Error
): string {
  const code =
    "code" in error
      ? String(
          (error as Error & {
            code?: string;
          }).code ?? ""
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
      return (
        error.message ||
        "Unable to sign in."
      );
  }
}