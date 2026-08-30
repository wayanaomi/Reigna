# Reigna — Product Decisions

This document records product/UX decisions made without explicit spec, per the operating instructions given for this project. Update it as new decisions are made.

## Information architecture

Primary navigation (left rail, OS-like, not a marketing-style sidebar):

1. **Command Center** — daily briefing: talk to today, needs approval, campaign health, sender health, activity.
2. **Discover** — natural-language / domain-based market search → ranked discovery results.
3. **Leads** — the full contact list + individual lead dossiers.
4. **Review** — the approval queue (three-pane: queue / draft / research).
5. **Campaigns** — campaign list + per-campaign operational detail.
6. **Mailboxes** — sender identities, connection state, sender health.
7. **Analytics** — cross-campaign tracking truth (sent/delivered/opened/clicked/replied/bounced/unsubscribed).
8. **Suppression** — global do-not-contact registry.
9. **Settings** — account, integrations (provider connection status), follow-up defaults.

Rejected: putting "Research" and "Personalization" as top-level nav items — they are steps inside the Lead detail dossier and Review queue, not destinations of their own, per "avoid making every possible feature a top-level navigation item."

## Currency

All monetary values in the product (future billing/plan surfaces) display in **Naira (₦)**, not USD — this is a standing product preference, not PRD-specified, applied via `formatNaira()` in `src/lib/utils.ts`.

## Real-data-only architecture (no mock/seed data)

**Decision:** The application contains zero mock, seeded, or fabricated business data at any layer, at any time — including local development. This supersedes an earlier draft of the service layer that used static mock fixtures; those were removed entirely.

Rationale: a product whose entire value proposition is "honest, non-fabricated intelligence about who to contact" cannot itself present fabricated activity without undermining its own credibility, even in a demo. It also prevents the common failure mode where mock data quietly leaks into perceived-real UI states during development and is never fully removed.

Consequences:
- `prisma/schema.prisma` defines structure only. No seed script populates Contact/Campaign/Message/SenderIdentity/Event/SuppressionEntry rows.
- Every service method that lists data returns a `ServiceListResult<T>` (`configured`, `items`, optional `error`) — see `/docs/ARCHITECTURE.md`. UI components branch on this to render one of three fundamentally different empty states rather than collapsing "not connected" and "connected but empty" into one generic "no data" message.
- External-provider services (discovery, research, personalization, verification) are implemented as real boundary interfaces with `isConfigured()` guards. Since no provider has been selected/contracted yet, they currently always report `configured: false` (or, once an API key is present, a clear "provider configured but not yet integrated" error) rather than returning invented results.
- A freshly registered account sees a fully designed, premium, **empty** workspace — this is treated as a first-class product state, not a loading/placeholder screen.

## Follow-up defaults

- v1 ships exactly one follow-up step. `Campaign.followUpDelayDays` defaults to `4`. No sequence builder in v1 per PRD scope.

## Engagement scoring (v1)

`Contact.engagementScore` (0–100) is a persisted column, updated by the (not-yet-built) event-ingestion pipeline as real tracking events arrive. "Talk to Today" simply ranks real, verified contacts by this real score and surfaces their real, persisted `whyThisPerson`/`recommendation`/`researchSignals` fields — it does not compute or invent a reason at read time.

## Sender health thresholds

`isIdentityHealthy()` (`src/lib/services/sending`) requires SPF + DKIM + DMARC all valid, bounce rate < 2%, complaint rate < 0.1%. These are conservative v1 defaults; revisit once real sending volume/data exists.

## Auth

Not yet implemented. Will follow the NextAuth v5 pattern noted in user memory (`edge-safe auth.config.ts` + full `auth.ts` w/ Prisma adapter) once account creation is in scope — deferred until after the core product surfaces (Command Center → Analytics) are built, per the specified build order.
