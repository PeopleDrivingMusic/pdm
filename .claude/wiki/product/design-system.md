---
title: Frontend & Design System
type: product
tags: [frontend, design-system, ui, svelte]
status: current
sources: [ui-design-system]
updated: 2026-06-30
---

# Frontend & Design System

SvelteKit frontend with a modular UI system. Primitives in `src/lib/ui`, shared
components in `src/lib/components`. New components use **Svelte 5 runes**.

## Zones
- `src/routes/(app)/+layout.svelte` — main app shell (sidebar + persistent player,
  see [[persistent-music-layer]]).
- `src/routes/(app)` — listener app: Home, Listen, Artists, Profile, Crowdfunding,
  admin/design demo.
- `src/routes/(login)` — auth (email + Google OAuth).
- `src/routes/studio` — artist Studio ([[studio-overview]]).
- `/admin/design` — live design-system demo.

## Tokens & themes
- `src/styles/tokens.css` — base CSS variables: brand colors `--color-brand-*`,
  semantic `--primary/--success/--warning/--error/--info`, backgrounds `--bg-*`,
  text `--text-*`, spacing `--space-1…24`, radii `--radius-sm…full`.
- `src/styles/_variables.scss` — mixins: typography (`text-*`, `font-*`), layout
  (`container`, `flex-center`, `flex-between`), `button-*`, `input-base`.
  Auto-injected into all SCSS via the `$styles` alias (vite config).
- `src/styles/themes/dark.css` + `light.css` — themes.

## Components
Base: `Button`, `Input`, `Select`, `Link`, `Checkbox`, `Avatar`, `StatCard`,
`Tabs`, `InfoMessage`, `NotificationContainer`, `FileUpload`, `Progress`,
`SvgIcon` (MDI paths). Media: `MusicTrack`, `MusicAlbum`, `MusicPlayer/*`, `Modal/*`.
Shared: `Sidebar`, `ThemeToggle`, `DesignSystemDemo`. Exported from
`src/lib/ui/index.ts`.

**Rule:** content/feature UIs must reuse these primitives and theme tokens — no
one-off colors/spacing/radii. Page files compose components and wire server
data/actions rather than hardcoding the experience ([[studio-content]]).
