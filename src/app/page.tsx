"use client";

import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { GoldDiamond } from "@/components/brand/gold-diamond";

const steps = [
  {
    number: "01",
    title: "Source Verified, compliant contact data",
    description:
      "Never scraped, never sourced in a way that torches your sender reputation before you've sent a single email.",
  },
  {
    number: "02",
    title: "Personalize Every email",
    description:
      "Each email is written fresh, per recipient, using real context about who they are and what they do. Not a mail-merge template with a first name dropped in.",
  },
  {
    number: "03",
    title: "Send",
    description:
      "Deliverability-safe infrastructure with built-in rate limits and domain protection, so your emails land in the inbox — not the spam folder you'll never see.",
  },
  {
    number: "04",
    title: "Follow Up — Intelligently",
    description:
      "Replies and clicks drive the decision to follow up. Opens are shown to you as a rough signal, clearly labeled as approximate — never the trigger for what happens next.",
  },
];

const differences = [
  {
    traditional:
      'Follow-up decided by "opens" (unreliable, inflated by Apple/Gmail)',
    reigna:
      "Follow-up decided by replies and clicks — signals that are actually real",
  },
  {
    traditional: "Same email, resent, hoping this time works",
    reigna: "A genuinely different angle on every follow-up",
  },
  {
    traditional: "One-size-fits-all AI templates",
    reigna: "Personalization grounded in real, specific context per recipient",
  },
  {
    traditional: "You find out it didn't work three weeks later",
    reigna: "Clear, honest analytics from day one",
  },
];

const features = [
  "AI email composition that writes a fresh, specific email for every recipient — not a template with blanks filled in",
  "Verified contact sourcing — compliant, never scraped, never a spam-complaint waiting to happen",
  "Deliverability infrastructure — rate limits, domain protection, and warm-up built in, not left to you to figure out",
  "Reply-first sequencing — follow-ups triggered by real engagement, not a broken pixel",
  "Clear, honest dashboard — see what's actually working, labeled accurately, no vanity metrics dressed up as results",
];

const faqs = [
  {
    question: "Is this going to get me flagged as spam?",
    answer:
      "Reigna's infrastructure is built specifically to prevent that — rate limits, domain protection, and compliant sourcing are default, not optional. That's infrastructure most cheaper tools skip entirely.",
  },
  {
    question:
      "How is this actually different from Instantly / Apollo / Smartlead?",
    answer:
      "Those tools were built when open-tracking still worked. Reigna was built after it stopped working — the entire follow-up engine is designed around that reality, not retrofitted onto it.",
  },
  {
    question: "What if I don't get replies in the trial?",
    answer:
      "Then you'll know quickly, cleanly, and honestly — which is the whole point. A tool that shows you accurate data, even when the data is discouraging, is more valuable than one that shows you flattering nonsense.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. No contracts, no lock-in.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#09070c] text-white selection:bg-[#d6a84f] selection:text-[#09070c]">
      {/* NAVIGATION */}
      <header className="relative z-50 border-b border-white/[0.08] bg-[#09070c]">
        <div className="mx-auto flex h-[82px] max-w-[1380px] items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center">
            <Wordmark />
          </Link>

          <nav className="hidden items-center gap-9 text-[13px] text-white/55 md:flex">
            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>
            <a href="#difference" className="transition hover:text-white">
              Why Reigna
            </a>
            <a href="#pricing" className="transition hover:text-white">
              Pricing
            </a>
            <a href="#faq" className="transition hover:text-white">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="hidden text-[13px] font-medium text-white/65 transition hover:text-white sm:block"
            >
              Log in
            </Link>

            <Link
              href="/login?mode=signup"
              className="border border-[#d6a84f] px-5 py-2.5 text-[13px] font-semibold text-[#d6a84f] transition hover:bg-[#d6a84f] hover:text-[#09070c]"
            >
              Try free
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================
          HERO
      ========================================================= */}
      <section className="relative border-b border-white/[0.08]">
        {/* subtle architectural lines */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.035]">
          <div className="absolute left-[8%] top-0 h-full w-px bg-white" />
          <div className="absolute left-[24%] top-0 h-full w-px bg-white" />
          <div className="absolute left-[76%] top-0 h-full w-px bg-white" />
          <div className="absolute left-[92%] top-0 h-full w-px bg-white" />
        </div>

        <div className="relative mx-auto grid min-h-[720px] max-w-[1380px] grid-cols-1 items-center gap-16 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:py-24">
          {/* LEFT */}
          <div className="relative z-10 max-w-[680px]">
            <div className="mb-8 flex items-center gap-4">
              <GoldDiamond />

              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d6a84f]">
                Outbound intelligence
              </span>

              <span className="h-px w-12 bg-[#d6a84f]/40" />
            </div>

            <h1 className="max-w-[720px] text-[58px] font-semibold leading-[0.94] tracking-[-0.055em] sm:text-[72px] lg:text-[92px]">
              Take Command
              <br />
              of Your{" "}
              <span className="relative whitespace-nowrap text-[#d6a84f]">
                Outreach.
                <span className="absolute -bottom-2 left-0 h-[2px] w-[78%] bg-[#d6a84f]/50" />
              </span>
            </h1>

            <p className="mt-9 max-w-[610px] text-[17px] leading-8 text-white/55 sm:text-[18px]">
              Reigna finds the right people, writes a genuinely unique email
              for every single one, and knows exactly when to follow up,
              because it&apos;s not fooled by a fake &quot;open&quot; the way
              every other tool on the market is.
            </p>

            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <a
                href="https://selar.com/reigna"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-5 bg-[#d6a84f] px-6 py-4 text-[13px] font-bold text-[#120e15] transition hover:bg-[#e4b85f]"
              >
                Subscribe to Pro — $99/mo
                <span className="text-lg transition-transform group-hover:translate-x-1">
                  →
                </span>
              </a>

              <Link
                href="/login?mode=signup"
                className="px-3 py-3 text-[13px] font-semibold text-white/70 underline decoration-white/20 underline-offset-4 transition hover:text-white"
              >
                Start with a free campaign
              </Link>
            </div>

            <div className="mt-7 flex items-center gap-3 text-[11px] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d6a84f]" />
              1 trial campaign · no card required
            </div>
          </div>

          {/* RIGHT — REIGNA INTELLIGENCE BOARD */}
          <div className="relative lg:pl-8">
            {/* floating label */}
            <div className="absolute -top-7 right-8 hidden items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-white/30 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d6a84f]" />
              Reigna intelligence
            </div>

            {/* Main board */}
            <div className="relative mx-auto max-w-[650px]">
              {/* back card */}
              <div className="absolute -right-4 -top-4 h-full w-full border border-[#d6a84f]/10 bg-[#d6a84f]/[0.025]" />

              <div className="relative border border-white/[0.12] bg-[#100d14] shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
                {/* board top */}
                <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <GoldDiamond />
                    <span className="text-[11px] font-semibold tracking-[0.18em] text-white/65">
                      OUTREACH / 01
                    </span>
                  </div>

                  <span className="text-[10px] text-white/25">
                    LIVE WORKSPACE
                  </span>
                </div>

                {/* prospect */}
                <div className="border-b border-white/[0.08] p-6 sm:p-8">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-[#d6a84f]">
                      Prospect identified
                    </span>

                    <span className="border border-[#6f8d69]/30 px-2 py-1 text-[9px] text-[#8eaa89]">
                      VERIFIED
                    </span>
                  </div>

                  <div className="flex items-start gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/10 bg-white/[0.04] text-sm font-semibold text-[#d6a84f]">
                      FT
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Femi Taiwo
                      </h3>

                      <p className="mt-1 text-xs text-white/40">
                        INITS Limited · Technology
                      </p>
                    </div>
                  </div>
                </div>

                {/* intelligence */}
                <div className="grid grid-cols-1 border-b border-white/[0.08] sm:grid-cols-2">
                  <div className="border-b border-white/[0.08] p-6 sm:border-b-0 sm:border-r">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-white/25">
                      Research signal
                    </p>

                    <p className="mt-4 text-sm leading-6 text-white/65">
                      Relevant company context identified for personalised
                      outreach.
                    </p>

                    <div className="mt-5 h-px w-16 bg-[#d6a84f]" />
                  </div>

                  <div className="p-6">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-white/25">
                      Email angle
                    </p>

                    <p className="mt-4 text-sm leading-6 text-white/65">
                      A specific reason for this person to care — not a
                      first-name merge.
                    </p>

                    <div className="mt-5 flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-[#d6a84f]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#d6a84f]" />
                      Freshly written
                    </div>
                  </div>
                </div>

                {/* email */}
                <div className="p-6 sm:p-8">
                  <div className="mb-5 flex items-center justify-between">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-white/25">
                      Message
                    </p>

                    <span className="text-[9px] text-white/20">
                      PERSONALIZED
                    </span>
                  </div>

                  <div className="border-l border-[#d6a84f]/60 pl-5">
                    <p className="text-sm leading-7 text-white/70">
                      Hi Femi,
                      <br />
                      <br />
                      I came across what your team is building at INITS and
                      wanted to reach out with a specific idea around your
                      current growth motion...
                    </p>
                  </div>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <div className="border border-white/10 px-3 py-2 text-[9px] uppercase tracking-[0.12em] text-white/35">
                      Sent safely
                    </div>

                    <div className="border border-white/10 px-3 py-2 text-[9px] uppercase tracking-[0.12em] text-white/35">
                      Reply-first
                    </div>

                    <div className="border border-[#d6a84f]/20 px-3 py-2 text-[9px] uppercase tracking-[0.12em] text-[#d6a84f]">
                      Follow-up: signal driven
                    </div>
                  </div>
                </div>
              </div>

              {/* small floating signal card */}
              <div className="absolute -bottom-7 -left-5 hidden w-[190px] border border-white/10 bg-[#151019] p-4 shadow-2xl sm:block">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] uppercase tracking-[0.18em] text-white/30">
                    Next decision
                  </span>

                  <span className="h-1.5 w-1.5 rounded-full bg-[#d6a84f]" />
                </div>

                <p className="mt-3 text-xs font-medium text-white/75">
                  Wait for a real signal.
                </p>

                <p className="mt-1 text-[9px] leading-4 text-white/30">
                  Replies and clicks matter. Opens don&apos;t decide what
                  happens next.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* bottom statement */}
        <div className="border-t border-white/[0.08]">
          <div className="mx-auto flex max-w-[1380px] flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-10">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/25">
              Find better prospects. Say something worth reading.
            </p>

            <p className="text-[11px] text-white/25">
              And know when to stop guessing.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          PROBLEM
      ========================================================= */}
      <section className="bg-[#f3eee6] text-[#17131a]">
        <div className="mx-auto max-w-[1380px] px-6 py-24 lg:px-10 lg:py-32">
          <div className="grid gap-14 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8d6a29]">
                The problem
              </p>

              <h2 className="mt-6 max-w-xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
                Most Outreach Tools Are Optimizing For a Lie
              </h2>
            </div>

            <div className="max-w-2xl space-y-6 text-[17px] leading-8 text-[#514b52]">
              <p>
                Every major cold-email platform on the market still triggers
                your follow-ups based on whether someone &quot;opened&quot;
                your email.
              </p>

              <p>
                Here&apos;s what they won&apos;t tell you: that signal has been
                broken for years. Apple&apos;s Mail Privacy Protection
                pre-loads a tracking pixel on every single email, whether a
                human ever looks at it or not. Gmail does something similar.
                Which means half the &quot;opens&quot; you&apos;re seeing are
                ghosts, and the other half of your real opens might never get
                logged at all.
              </p>

              <p>
                So your outreach tool is making a decision that matters, when
                to follow up, when to back off, based on a coin flip it thinks
                is data.
              </p>

              <p className="font-semibold text-[#17131a]">
                Reigna doesn&apos;t play that game.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          HOW IT WORKS
      ========================================================= */}
      <section id="how-it-works" className="bg-[#09070c]">
        <div className="mx-auto max-w-[1380px] px-6 py-24 lg:px-10 lg:py-32">
          <div className="grid gap-10 lg:grid-cols-[0.65fr_1.35fr]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d6a84f]">
                How Reigna works
              </p>

              <h2 className="mt-6 text-4xl font-semibold leading-[1] tracking-[-0.04em] sm:text-6xl">
                Four Steps.
                <br />
                Zero Guesswork.
              </h2>
            </div>

            <div className="grid border-l border-white/10 sm:grid-cols-2">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="border-b border-white/10 p-7 sm:p-9"
                >
                  <span className="text-[11px] font-semibold text-[#d6a84f]">
                    {step.number}
                  </span>

                  <h3 className="mt-12 max-w-sm text-xl font-semibold leading-tight">
                    {step.title}
                  </h3>

                  <p className="mt-4 max-w-md text-sm leading-7 text-white/45">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          DIFFERENTIATOR
      ========================================================= */}
      <section id="difference" className="bg-[#151019]">
        <div className="mx-auto max-w-[1380px] px-6 py-24 lg:px-10 lg:py-32">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d6a84f]">
              The differentiator
            </p>

            <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
              Built on Reply-First Logic
            </h2>
          </div>

          <div className="mt-16 border-t border-white/10">
            <div className="grid grid-cols-2 border-b border-white/10 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              <div>Most Outreach Tools</div>
              <div className="text-[#d6a84f]">Reigna</div>
            </div>

            {differences.map((difference, index) => (
              <div
                key={index}
                className="grid grid-cols-2 border-b border-white/10"
              >
                <div className="p-6 pr-8 text-sm leading-7 text-white/35 sm:p-8">
                  {difference.traditional}
                </div>

                <div className="border-l border-white/10 p-6 pl-8 text-sm leading-7 text-white/75 sm:p-8">
                  <span className="mr-3 text-[#d6a84f]">↗</span>
                  {difference.reigna}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          FEATURES
      ========================================================= */}
      <section className="bg-[#f3eee6] text-[#17131a]">
        <div className="mx-auto max-w-[1380px] px-6 py-24 lg:px-10 lg:py-32">
          <div className="grid gap-16 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8d6a29]">
                Features
              </p>

              <h2 className="mt-6 text-4xl font-semibold leading-[1] tracking-[-0.04em] sm:text-6xl">
                Built for outreach that thinks before it sends.
              </h2>
            </div>

            <div className="border-t border-[#17131a]/15">
              {features.map((feature, index) => (
                <div
                  key={feature}
                  className="flex gap-7 border-b border-[#17131a]/15 py-7"
                >
                  <span className="text-[11px] font-semibold text-[#8d6a29]">
                    0{index + 1}
                  </span>

                  <p className="max-w-xl text-[15px] leading-7 text-[#514b52]">
                    {feature}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          GUARANTEE
      ========================================================= */}
      <section className="border-y border-white/10 bg-[#09070c]">
        <div className="mx-auto max-w-[1000px] px-6 py-28 text-center lg:py-36">
          <GoldDiamond />

          <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.25em] text-[#d6a84f]">
            The Reigna Guarantee
          </p>

          <h2 className="mt-6 text-4xl font-semibold leading-[1] tracking-[-0.04em] sm:text-6xl">
            We Don&apos;t Guarantee Replies.
            <br />
            <span className="text-[#d6a84f]">
              We Guarantee Strategy.
            </span>
          </h2>

          <p className="mx-auto mt-9 max-w-3xl text-[16px] leading-8 text-white/45">
            We won&apos;t insult you with a promise no honest tool can keep —
            nobody can guarantee a stranger replies to your email. Anyone who
            tells you otherwise is selling you a fantasy.
          </p>

          <p className="mx-auto mt-6 max-w-3xl text-[16px] leading-8 text-white/45">
            Here&apos;s what we will promise: if Reigna doesn&apos;t feel
            sharper, more honest, and more genuinely useful than whatever
            you&apos;re using right now within your first 14 days on Pro,
            we&apos;ll refund you in full. No retention call. No
            &quot;are you sure?&quot;
          </p>
        </div>
      </section>

      {/* =========================================================
          PRICING
      ========================================================= */}
      <section id="pricing" className="bg-[#f3eee6] text-[#17131a]">
        <div className="mx-auto max-w-[1380px] px-6 py-24 lg:px-10 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8d6a29]">
                Pricing
              </p>

              <h2 className="mt-6 max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-7xl">
                Start free.
                <br />
                Upgrade when you&apos;re ready.
              </h2>

              <p className="mt-6 max-w-xl text-[15px] leading-7 text-[#6b646b]">
                Free Trial. 1 trial campaign. No card required. Refer someone
                with your affiliate link to unlock a second free trial.
              </p>
            </div>

            <div className="border-2 border-[#d6a84f] bg-white p-8 sm:p-10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8d6a29]">
                    Pro
                  </p>

                  <p className="mt-4 text-5xl font-semibold tracking-[-0.04em]">
                    $99
                  </p>

                  <p className="mt-1 text-sm text-[#777]">per month</p>
                </div>

                <GoldDiamond />
              </div>

              <p className="mt-8 text-sm leading-7 text-[#5d575d]">
                Everything in Reigna. Unlimited campaigns. Full reply-first
                sequencing. Full dashboard. Cancel anytime.
              </p>

              <a
                href="https://selar.com/reigna"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 block bg-[#17131a] px-6 py-4 text-center text-[13px] font-bold text-white transition hover:bg-[#302a33]"
              >
                Subscribe to Pro — $99/mo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          FAQ
      ========================================================= */}
      <section id="faq" className="bg-[#09070c]">
        <div className="mx-auto max-w-[1000px] px-6 py-24 lg:py-32">
          <div className="mb-14">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d6a84f]">
              FAQ
            </p>

            <h2 className="mt-6 text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">
              Straight answers.
            </h2>
          </div>

          <div className="border-t border-white/10">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group border-b border-white/10 py-7"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-8 text-[16px] font-semibold">
                  <span>{faq.question}</span>

                  <span className="text-2xl font-light text-[#d6a84f] transition group-open:rotate-45">
                    +
                  </span>
                </summary>

                <p className="mt-5 max-w-3xl text-sm leading-7 text-white/45">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          FINAL CTA
      ========================================================= */}
      <section className="bg-[#d6a84f] text-[#17131a]">
        <div className="mx-auto max-w-[1380px] px-6 py-24 lg:px-10 lg:py-32">
          <div className="flex flex-col justify-between gap-12 lg:flex-row lg:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#17131a]/55">
                Reigna
              </p>

              <h2 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-7xl lg:text-8xl">
                Your Outreach Deserves Better Than a Guess.
              </h2>
            </div>

            <div className="shrink-0 lg:pb-2">
              <a
                href="https://selar.com/reigna"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-8 bg-[#17131a] px-7 py-5 text-[13px] font-bold text-white transition hover:bg-[#302a33]"
              >
                Subscribe to Pro — $99/mo
                <span className="text-lg transition-transform group-hover:translate-x-1">
                  →
                </span>
              </a>

              <p className="mt-5 max-w-sm text-xs leading-5 text-[#17131a]/60">
                Or start with 1 free trial campaign — no card required. Use an
                affiliate link for a second, free.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#09070c]">
        <div className="mx-auto flex max-w-[1380px] flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <Link href="/" className="flex items-center">
            <Wordmark />
          </Link>

          <p className="text-[11px] text-white/25">
            © {new Date().getFullYear()} Reigna. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}