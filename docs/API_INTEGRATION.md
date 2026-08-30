# Reigna — API / Integration Boundaries

How each service boundary in `src/lib/services` moves from "not connected" to live, and what mock-vs-live separation looks like (there is no mock mode — only "unconfigured" vs "configured").

## Discovery (`src/lib/services/discovery`)

- **Trigger:** `DISCOVERY_PROVIDER_API_KEY` env var.
- **Today:** `isConfigured()` gates `search()`; returns an empty, non-fabricated result set either way until a provider is wired in.
- **To go live:** choose a company/contact search provider, implement the HTTP call inside `search()`, map its response to `DiscoveryResult[]`.

## Verification (`src/lib/services/verification`)

- **Trigger:** `EMAIL_VERIFICATION_API_KEY`.
- **To go live:** call the provider from `verifyEmail()`, map its response to `VerificationStatus`.

## Research (`src/lib/services/research`)

- **Trigger:** `AI_PROVIDER_API_KEY`.
- **To go live:** call the provider from `researchCompany()`, return only verifiable `ResearchSignal[]` with sources — never unattributed claims.

## Personalization / AI writing (`src/lib/services/personalization`)

- **Trigger:** `AI_PROVIDER_API_KEY`.
- **To go live:** call the provider from `generateDraft()`, grounded strictly in the `researchSummary`/`researchSignals` passed in — the draft must be traceable to real research, never invented.

## Mailboxes / Sending (`src/lib/services/sending`)

- **Trigger:** `GOOGLE_OAUTH_CLIENT_ID`/`SECRET` and/or `MICROSOFT_OAUTH_CLIENT_ID`/`SECRET` (checked via `getMailboxProviderStatus()`).
- **Today:** `SenderIdentity` rows only exist once an operator completes a real OAuth mailbox connection — there is no default/demo mailbox.
- **To go live:** implement the OAuth flow, persist tokens securely (never store raw passwords), create a `SenderIdentity` row per connected mailbox, and implement actual SPF/DKIM/DMARC lookups.

## Tracking (`src/lib/services/tracking`)

- **Trigger:** none — this is purely internal. Populated by real `Event` rows created when the sending/tracking pipeline observes delivery, opens, clicks, replies, bounces, unsubscribes.
- Be explicit in the UI that open tracking is a signal, not ground truth (Apple Mail Privacy Protection, etc.).

## Database (`src/lib/db.ts`)

- **Trigger:** `DATABASE_URL`.
- `prisma` export is `null` when unset; every DB-backed service checks `isDatabaseConfigured` before querying and reports `configured: false` rather than throwing.
- Run `npx prisma migrate dev` to apply `prisma/schema.prisma` once a real Postgres instance is available. No seed script is run or should be added for business data.
