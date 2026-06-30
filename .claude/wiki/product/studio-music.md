---
title: Studio — Music
type: product
tags: [product, studio, music, catalog, mvp]
status: current
sources: [studio-music-spec, artistflow]
updated: 2026-06-30
---

# Studio — Music

The artist's catalog manager: upload content and see the economics of each song.

## MVP scope
- Display tracks and albums.
- Create album (cover, description, title, release date, genres).
- Create track (audio upload, title, cover, duration, genres).
- Manage tracks/albums (edit, delete).
- Add/remove tracks from albums.

## UI
- Album grid (cover, title, release date, status).
- Track table/list (title, duration, play/like/save metrics, status) — with
  sparklines per [[studio-overview]].
- Modals/forms to create/edit albums and tracks; manage track↔album links.
- Page composed via a `StudioMusicPage` component beside `+page.svelte`; reuse
  `src/lib/ui` primitives and theme tokens ([[design-system]]).

## Per-track economics (target)
Retention (% who finish), conversion (listeners → subscribers after this song),
ROI (streaming + bought-out shares).

## Technical
- Data in Postgres via Drizzle; CRUD through SvelteKit endpoints; reads via server
  `load`. Entities: [[track]], [[album]], plus `track_stats` ([[data-model]]).
- Audio/cover files via the media pipeline ([[media-storage]]). (The original MVP
  spec used local `static/uploads/`; the current implementation uses Cloudflare R2
  presigned uploads — `static/uploads` is **superseded**.)
- Actions launch crowdfunding once the artist reaches **Creator** grade
  ([[artist-grades]], [[revenue-share-crowdfunding]]).
