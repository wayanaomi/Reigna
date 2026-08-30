# Reigna — Architecture

## Stack

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript** (strict).
- **Tailwind CSS v4** (CSS-first config via `@theme inline` in `globals.css` — no `tailwind.config.ts`).
- **Prisma 6** targeting **PostgreSQL** (`prisma/schema.prisma`).
- **Zod** for input validation at server boundaries.
- **Radix UI primitives** (dialog, tabs, dropdown, tooltip) as unstyled accessible building blocks — never used as a visual design system. Reigna's visual identity comes entirely from custom components in `src/components`.
- **class-variance-authority** + **tailwind-merge** for variant-driven component styling.
- **lucide-react** for functional UI icons only (never brand/decorative icons).

## Directory structure

```
src/
  app/                 Route segments (App Router). Thin — pages compose components.
  components/
    brand/             Wordmark, gold diamond, brand-specific primitives.
    navigation/         App shell / primary navigation.
    ui/                Reusable, headless-ish UI primitives (Button, StatusBadge, EmptyState, ...).
    command-center/, discovery/, leads/, research/, personalization/,
    review/, campaigns/, sending/, analytics/, settings/
                        Feature-scoped components, one responsibility per file.
  lib/
    db.ts              Prisma client singleton + `isDatabaseConfigured`.
    services/          Service boundary interfaces — see API_INTEGRATION.md.
    utils.ts           cn(), formatNaira(), timeAgo(), initials().
  types/                Plain TypeScript domain types (mirror prisma/schema.prisma).
prisma/
  schema.prisma        Source of truth for the data model.
public/
  brand/               Real logo assets (reigna-wordmark.svg, etc.) — see DESIGN_SYSTEM.md.
docs/                   This documentation set.
```

## Data flow

1. **UI components never import Prisma directly.** They call a service from `src/lib/services/*`.
2. **Services never return raw Prisma rows.** Each service maps rows to the plain types in `src/types` via `src/lib/services/mappers.ts`, so the UI has zero coupling to the ORM.
3. **Every list-returning service method returns a `ServiceListResult<T>`** (`src/lib/services/types.ts`):
   ```ts
   { configured: boolean; items: T[]; error?: string }
   ```
   - `configured: false` — the integration/database isn't connected yet. The UI renders a **setup/connection** empty state.
   - `configured: true, items: []` — connected, genuinely no records yet. The UI renders a **first-run** empty state.
   - `error` set — connected but the read failed. The UI renders an **error** state in Reigna's voice.

   This is a deliberate, permanent architectural decision — see `/docs/DECISIONS.md` — not a temporary scaffold.

4. **No seed/demo/mock data exists anywhere in the application runtime.** `prisma/schema.prisma` defines structure only; a fresh database has zero business rows. See `/docs/DECISIONS.md`.

## Two categories of service

| Category | Examples | Backing | Empty/unconfigured trigger |
|---|---|---|---|
| Database-backed | contacts, campaigns, review, sending (identities), tracking, suppression, engagement | `prisma` client | `DATABASE_URL` unset, or query throws |
| External-provider-backed | discovery, research, personalization (AI writing), verification | Third-party API (not yet integrated) | Provider API key env var unset |

Provider-backed services expose a synchronous `isConfigured()` in addition to their async methods, so pages can render the correct setup copy without an extra round-trip.

## AI / outbound pipeline (conceptual)

```
INPUT → FIND BUSINESS (discovery) → IDENTIFY DECISION MAKER → FIND EMAIL
      → VERIFY EMAIL (verification) → RESEARCH BUSINESS (research)
      → EXTRACT SIGNALS → GENERATE DRAFT (personalization)
      → HUMAN REVIEW (review) → SEND (sending) → TRACK (tracking)
      → FOLLOW UP → PRIORITIZE (engagement / Talk to Today)
```

Each arrow above corresponds to a service boundary in `src/lib/services`. None of these are wired to a live third-party provider yet (see `/docs/API_INTEGRATION.md` for what's required to connect each one) — the UI must always reflect that honestly.

## Environment variables

See `.env.example` for the full list. Required for full functionality:

- `DATABASE_URL` — PostgreSQL connection string.
- `AUTH_SECRET` — session signing secret.
- `AI_PROVIDER_API_KEY` — research + personalization.
- `DISCOVERY_PROVIDER_API_KEY` — company/contact discovery.
- `EMAIL_VERIFICATION_API_KEY` — email verification.
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`, `MICROSOFT_OAUTH_CLIENT_ID` / `MICROSOFT_OAUTH_CLIENT_SECRET` — mailbox connection.
- `TRACKING_BASE_URL` — base URL for open/click tracking links.

None of these have to be set for the app to run — it will simply present the appropriate "not connected" states.
