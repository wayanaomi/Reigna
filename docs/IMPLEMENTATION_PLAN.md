# Reigna — Implementation Plan

Tracks phase-by-phase progress. Keep in sync with the in-session todo list.

## Phase 0 — Foundation (in progress)

- [x] Inspect repository (was empty), scaffold Next.js + TypeScript + Tailwind v4.
- [x] Brand design tokens (colors, fonts) wired into `globals.css`.
- [x] Prisma schema for core entities (Contact, Campaign, CampaignContact, Message, SenderIdentity, Event, SuppressionEntry).
- [x] Real-data service layer (`src/lib/services/*`) — no mock data, explicit configured/empty/error states.
- [ ] App shell + primary navigation (OS-like IA, not a template sidebar).
- [ ] Shared `EmptyState` / `StatusBadge` / loading primitives finished.
- [x] `/docs` documentation set.

## Phase 1 — Core product

- [ ] Command Center (empty-state-first: no talk-to-today, no approvals, no campaigns, no sender identities).
- [ ] Discover (provider-not-connected state first; real search UI ready the moment `DISCOVERY_PROVIDER_API_KEY` is set).
- [ ] Leads list + Lead detail dossier.
- [ ] Review queue (three-pane).

## Phase 2 — Outbound

- [ ] Campaigns list + detail.
- [ ] Mailbox connection (OAuth) + Sender Health.

## Phase 3 — Intelligence

- [ ] Analytics (tracking truth, cross-campaign).
- [ ] Suppression list.
- [ ] Follow-up configuration surfaced in campaign settings.

## Phase 4 — Polish

- [ ] Responsive pass, accessibility audit, lint/typecheck/build clean, browser QA.

## Explicitly deferred (per PRD scope)

LinkedIn/SMS/phone channels, multichannel sequencing, team permissions, white-label mode, autonomous first-touch sending, proprietary warm-up infra.
