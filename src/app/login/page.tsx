"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  firebaseAuth,
  googleProvider,
  signInWithPopup,
} from "@/lib/firebase/client";

import { Wordmark } from "@/components/brand/wordmark";

function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.27c0-.73-.07-1.43-.21-2.1H12v3.98h5.24a4.48 4.48 0 0 1-1.95 2.94v2.45h3.15c1.85-1.7 2.91-4.2 2.91-7.27Z"
      />
      <path
        fill="#34A853"
        d="M12 21.84c2.64 0 4.86-.87 6.48-2.36l-3.15-2.45c-.87.58-1.98.93-3.33.93-2.56 0-4.73-1.73-5.51-4.06H3.24v2.53A9.8 9.8 0 0 0 12 21.84Z"
      />
      <path
        fill="#FBBC05"
        d="M6.49 13.9A5.9 5.9 0 0 1 6.18 12c0-.66.11-1.3.31-1.9V7.57H3.24A9.84 9.84 0 0 0 2.2 12c0 1.59.38 3.1 1.04 4.43l3.25-2.53Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.04c1.44 0 2.73.5 3.75 1.49l2.81-2.81C16.85 3.13 14.63 2.16 12 2.16a9.8 9.8 0 0 0-8.76 5.41L6.49 10.1C7.27 7.77 9.44 6.04 12 6.04Z"
      />
    </svg>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  ) : (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10.58 6.22A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16.8 16.8 0 0 1-3.06 3.57M6.7 6.7C4.01 8.3 2.5 12 2.5 12s3.5 6 9.5 6c1.35 0 2.55-.29 3.6-.73"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m13 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isSignup, setIsSignup] = useState(
    searchParams.get("mode") === "signup"
  );

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  async function createReignaSession(idToken: string) {
    const response = await fetch("/api/auth/firebase/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);

      throw new Error(
        data?.error || "Couldn't create your Reigna session."
      );
    }
  }

  function getAuthErrorMessage(error: unknown) {
    if (!(error instanceof Error)) {
      return "Authentication failed.";
    }

    switch (error.message) {
      case "Firebase: Error (auth/email-already-in-use).":
        return "An account already exists with this email. Please sign in instead.";

      case "Firebase: Error (auth/invalid-email).":
        return "Please enter a valid email address.";

      case "Firebase: Error (auth/weak-password).":
        return "Your password is too weak. Please use a stronger password.";

      case "Firebase: Error (auth/invalid-credential).":
        return "Invalid email or password.";

      case "Firebase: Error (auth/user-not-found).":
        return "No account was found with this email. Please create an account.";

      case "Firebase: Error (auth/wrong-password).":
        return "Incorrect password.";

      case "Firebase: Error (auth/popup-closed-by-user).":
        return "Google sign-in was cancelled.";

      case "Firebase: Error (auth/popup-blocked).":
        return "Your browser blocked the Google sign-in window. Please allow pop-ups and try again.";

      default:
        return error.message || "Authentication failed.";
    }
  }

  async function handleEmailAuth() {
    setError("");

    if (isSignup && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (isSignup && password.length < 6) {
      setError("Your password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const credential = isSignup
        ? await createUserWithEmailAndPassword(
            firebaseAuth,
            email.trim(),
            password
          )
        : await signInWithEmailAndPassword(
            firebaseAuth,
            email.trim(),
            password
          );

      const idToken = await credential.user.getIdToken();

      await createReignaSession(idToken);

      router.push("/app");
      router.refresh();
    } catch (error) {
      console.error("Authentication error:", error);
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");

    try {
      setLoading(true);

      const result = await signInWithPopup(
        firebaseAuth,
        googleProvider
      );

      const idToken = await result.user.getIdToken();

      await createReignaSession(idToken);

      router.push("/app");
      router.refresh();
    } catch (error) {
      console.error("Google authentication error:", error);
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextSignup: boolean) {
    if (loading || nextSignup === isSignup) {
      return;
    }

    setIsSignup(nextSignup);
    setError("");
    setShowPassword(false);

    if (!nextSignup) {
      setName("");
    }

    router.replace(
      nextSignup ? "/login?mode=signup" : "/login"
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbf7ef] px-5 py-10 text-[#211f20] sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-44 h-80 w-80 rotate-45 rounded-[90px] bg-[#d6a84f]/10"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full border-[30px] border-[#2b1745]/[0.055]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-28 h-80 w-80 rotate-45 rounded-[90px] border-[26px] border-[#d6a84f]/10"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[440px] flex-col items-center justify-center sm:min-h-[calc(100vh-6rem)]">
        <div className="mb-8 flex flex-col items-center text-center">
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="Back to Reigna homepage"
            className="transition-opacity hover:opacity-80"
          >
            <Wordmark
              tone="purple"
              className="scale-[1.08]"
            />
          </button>

          <p className="mt-5 text-sm font-medium text-[#6f6676]">
            Intelligence for outbound.
          </p>
        </div>

        <section className="w-full rounded-2xl border border-[#ded4c7] bg-white p-5 shadow-[0_20px_60px_rgba(43,23,69,0.08)] sm:p-7">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#dcd6ce] bg-white text-sm font-semibold text-[#29242d] transition hover:border-[#c8bfb5] hover:bg-[#fffdfa] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GoogleIcon />

            <span>
              {loading
                ? "Please wait..."
                : "Continue with Google"}
            </span>
          </button>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#e8e1d8]" />

            <span className="text-xs font-medium text-[#a59d94]">
              or
            </span>

            <div className="h-px flex-1 bg-[#e8e1d8]" />
          </div>

          <div className="mb-7 grid grid-cols-2 rounded-lg bg-[#f1ece5] p-1">
            <button
              type="button"
              onClick={() => switchMode(false)}
              disabled={loading}
              className={`h-10 rounded-md text-sm font-semibold transition ${
                !isSignup
                  ? "bg-white text-[#2b1745] shadow-[0_2px_6px_rgba(43,23,69,0.10)]"
                  : "text-[#817983] hover:text-[#4a4350]"
              }`}
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={() => switchMode(true)}
              disabled={loading}
              className={`h-10 rounded-md text-sm font-semibold transition ${
                isSignup
                  ? "bg-white text-[#2b1745] shadow-[0_2px_6px_rgba(43,23,69,0.10)]"
                  : "text-[#817983] hover:text-[#4a4350]"
              }`}
            >
              Sign up
            </button>
          </div>

          <div className="space-y-4">
            {isSignup && (
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-semibold text-[#342e36]"
                >
                  Name
                </label>

                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError("");
                  }}
                  disabled={loading}
                  className="h-12 w-full rounded-lg border border-[#ddd6cd] bg-[#fffdfa] px-3.5 text-sm text-[#211f20] outline-none transition placeholder:text-[#aaa39a] focus:border-[#d6a84f] focus:ring-2 focus:ring-[#d6a84f]/15 disabled:bg-[#f7f4ef]"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-semibold text-[#342e36]"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                disabled={loading}
                className="h-12 w-full rounded-lg border border-[#ddd6cd] bg-[#fffdfa] px-3.5 text-sm text-[#211f20] outline-none transition placeholder:text-[#aaa39a] focus:border-[#d6a84f] focus:ring-2 focus:ring-[#d6a84f]/15 disabled:bg-[#f7f4ef]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-semibold text-[#342e36]"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    isSignup
                      ? "new-password"
                      : "current-password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  disabled={loading}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleEmailAuth();
                    }
                  }}
                  className="h-12 w-full rounded-lg border border-[#ddd6cd] bg-[#fffdfa] px-3.5 pr-12 text-sm text-[#211f20] outline-none transition placeholder:text-[#aaa39a] focus:border-[#d6a84f] focus:ring-2 focus:ring-[#d6a84f]/15 disabled:bg-[#f7f4ef]"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8f8780] transition hover:text-[#2b1745] disabled:opacity-50"
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-[#e7c9c0] bg-[#fff6f2] px-3.5 py-3 text-sm leading-5 text-[#914b3d]"
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleEmailAuth}
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2b1745] text-sm font-bold text-white shadow-[0_8px_20px_rgba(43,23,69,0.16)] transition hover:bg-[#351d52] hover:shadow-[0_10px_24px_rgba(43,23,69,0.20)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>
                {loading
                  ? "Please wait..."
                  : isSignup
                  ? "Create account"
                  : "Sign in"}
              </span>

              {!loading && (
                <span className="text-[#d6a84f]">
                  <ArrowIcon />
                </span>
              )}
            </button>
          </div>

          <div className="mt-6 border-t border-[#eee9e2] pt-5 text-center">
            <p className="text-sm text-[#77716d]">
              {isSignup
                ? "Already have an account?"
                : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => switchMode(!isSignup)}
                disabled={loading}
                className="font-bold text-[#b47b2d] transition hover:text-[#2b1745] disabled:opacity-50"
              >
                {isSignup ? "Sign in" : "Sign up"}
              </button>
            </p>
          </div>
        </section>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-7 flex items-center gap-2 text-sm font-medium text-[#77716d] transition hover:text-[#2b1745]"
        >
          <span>←</span>
          <span>Back to homepage</span>
        </button>

        <div className="mt-7 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#a37536]">
            More research. Better outreach.
          </p>

          <div className="mx-auto mt-2 h-0.5 w-8 bg-[#d6a84f]" />
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#fbf7ef] px-5">
          <div className="w-full max-w-md rounded-2xl border border-[#ded4c7] bg-white p-7 shadow-[0_20px_60px_rgba(43,23,69,0.08)]">
            <div className="mx-auto h-10 w-32 animate-pulse rounded bg-[#eee8df]" />

            <div className="mx-auto mt-5 h-4 w-48 animate-pulse rounded bg-[#f1ede7]" />

            <div className="mt-8 h-12 w-full animate-pulse rounded-lg bg-[#f1ede7]" />

            <div className="mt-6 h-10 w-full animate-pulse rounded-lg bg-[#f1ede7]" />

            <div className="mt-6 h-12 w-full animate-pulse rounded-lg bg-[#f1ede7]" />

            <div className="mt-4 h-12 w-full animate-pulse rounded-lg bg-[#f1ede7]" />
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}