export const dynamic = "force-dynamic";

import { prisma, isDatabaseConfigured } from "@/lib/db";
import { resolveWordmarkAsset } from "@/lib/brand-assets";
import { Wordmark } from "@/components/brand/wordmark";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const logoSrc = resolveWordmarkAsset();
  let hasOwner = true;

if (isDatabaseConfigured && prisma) {
  try {
    hasOwner = (await prisma.user.count()) > 0;
  } catch {
    // Keep the login page available even if the database
    // is temporarily unavailable.
    hasOwner = true;
  }
}

  return (
    <div className="flex min-h-screen items-center justify-center bg-purple-deep px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-4">
          <Wordmark tone="cream" logoSrc={logoSrc} />
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-cream/60">
            Outbound intelligence, operated by you
          </p>
        </div>

        {!isDatabaseConfigured ? (
          <p className="border-t-2 border-t-gold-antique bg-white/5 px-5 py-4 text-sm leading-relaxed text-cream/80">
            No database connection. Set <code className="text-gold">DATABASE_URL</code> before Reigna can create or
            recognize an owner account.
          </p>
        ) : (
          <LoginForm mode={hasOwner ? "signin" : "bootstrap"} />
        )}
      </div>
    </div>
  );
}
