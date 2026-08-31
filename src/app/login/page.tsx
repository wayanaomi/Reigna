export const dynamic = "force-dynamic";

import { isDatabaseConfigured } from "@/lib/db";
import { resolveWordmarkAsset } from "@/lib/brand-assets";
import { Wordmark } from "@/components/brand/wordmark";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const logoSrc = resolveWordmarkAsset();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-purple-deep px-6 py-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" >
        <div className="absolute left-[8%] top-[14%] h-40 w-40 rounded-full border border-gold/10" />
        <div className="absolute bottom-[10%] right-[7%] h-56 w-56 rounded-full border border-white/5" />
        <div className="absolute left-1/2 top-0 h-px w-48 -translate-x-1/2 bg-gold/30" />
    </div>
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
          <LoginForm mode="signin" />
        )}
      </div>
    </div>
  );
}
