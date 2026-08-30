# Reigna — Design System

## Brand character

Sovereign. Sharp. Unstoppable. Autonomous, highly intelligent, witty, strategic, prosperous. Reigna should never look desperate for attention, and should never resemble a generic AI SaaS product (see `/docs/DECISIONS.md` for the explicit anti-patterns we reject).

## Color tokens

Defined in `src/app/globals.css` as CSS custom properties, registered with Tailwind v4 via `@theme inline`. Use the Tailwind utilities (`bg-purple`, `text-gold`, `border-border-subtle`, etc.) rather than hardcoded hex values in components.

| Token | Hex | Tailwind utility | Use |
|---|---|---|---|
| Sovereign Purple | `#3D2465` | `purple` | Primary anchor — buttons, active nav, key emphasis |
| Regal Gold | `#C9A227` | `gold` | Signal only — priority, high-confidence, the diamond motif |
| Deep Purple | `#271740` | `purple-deep` | Hover/pressed states on purple |
| Antique Gold | `#B8860B` | `gold-antique` | Warning status tone |
| Wine | `#7A1F3D` | `wine` | Rare — reserved accent, not yet used in v1 |
| Charcoal | `#1A1A1A` | `charcoal` | Primary text |
| Slate Grey | `#595959` | `slate` | Secondary text |
| Cream | `#FDFAF3` | `cream` / `background` | Primary surface (paper-like) |
| White | `#FFFFFF` | `surface` | Cards / elevated surfaces |

**Ratio discipline:** ~60% neutral/whitespace, ~30% purple, ~10% gold. Gold never covers backgrounds or large surfaces — it marks a status dot, a diamond, or a single emphasized numeral.

## Typography

- **Display** (`font-display` → Georgia Bold): page titles, section headers, the Command Center's narrative headline. Bold weight only.
- **Body/UI** (`font-sans` → system sans stack: -apple-system/Segoe UI/Helvetica/Arial): everything else — labels, body copy, form controls, tables.

Both are system fonts (no Google Fonts network dependency — see `/docs/DECISIONS.md`), chosen from the brand guide's explicit alternatives ("Georgia Bold **or** Playfair Display" for display; "Helvetica / Arial / Inter equivalent" for body).

Hierarchy is created through size + weight + spacing, not decoration. Avoid more than 3–4 distinct type sizes per screen.

## The gold diamond

`src/components/brand/gold-diamond.tsx`. A single, meaningful signal — reserved for: the single highest-priority "Talk to Today" contact, an exceptional reply opportunity, or a high-confidence research signal worth calling out. It is never used as a bullet, a decorative divider substitute, or repeated more than a handful of times on any one screen.

## Logo

`src/components/brand/wordmark.tsx` looks for a real asset at `/public/brand/reigna-wordmark.svg` (or `.png`) and renders it directly via `next/image` when present. Until the real asset is supplied, it falls back to a typographic placeholder built from the brand's own tokens (Playfair wordmark + gold rule + gold diamond) — this fallback must be replaced by the real asset before shipping; it must never be hand-approximated further or treated as final.

Expected asset paths (create the folder, populate as assets become available):
```
public/brand/reigna-wordmark.svg
public/brand/reigna-crest.svg
public/brand/reigna-minimal-crest.svg
```

## Surfaces & structure

- Prefer whitespace and thin rules (`border-border-subtle`) over cards+shadows. Not every section needs a bounding box.
- When a container is warranted (e.g. the review queue's three-pane layout), use `bg-surface` on `bg-background`, a single subtle border, and no shadow, or at most a 1px shadow for a genuinely floating element (modal, popover).
- Corners are subtly rounded (`rounded-sm`, 2px) — never pill-shaped, never large radii. This is an editorial/executive product, not a consumer app.

## States

Every data-bearing view must render one of: loading, unconfigured (integration/DB not connected), empty (connected, no records), error, or populated. See `src/components/ui/empty-state.tsx` and `/docs/DECISIONS.md` for the copy rules governing each.

## Motion

Motion communicates state changes (a message moving from queued → approved, a drawer opening), never decoration. No parallax, no floating/bobbing elements, no gradient shimmer. Respect `prefers-reduced-motion` (already handled globally in `globals.css`).

## Voice

Direct, confident, unhurried. Banned words: "supercharge", "10x", "unlock", "revolutionary", "AI-powered magic", "blast", "dominate", "game-changing". See `/docs/DECISIONS.md` for the full microcopy policy and canonical empty/error state copy.
