---
title: Data Model (Postgres / Drizzle)
type: architecture
tags: [architecture, database, drizzle, postgres, schema]
status: current
sources: [database, claude-md, studio-content-spec]
updated: 2026-06-30
---

# Data Model (Postgres / Drizzle)

Canonical relational data lives in **PostgreSQL** via **Drizzle ORM**
(`postgres-js`). The schema is **split by domain** under `src/lib/db/schemas/`
(`users`, `artist`, `content`, `catalog`, `engagement`, `finance`, `user-library`,
`core`) and re-aggregated in `src/lib/db/schema.ts`, which also defines all Drizzle
`relations` and `$inferSelect`/`$inferInsert` types.

> **Footgun:** `drizzle.config.ts` points at `schema.ts`. A new table must be added
> to both its domain file **and** the aggregator, or migrations/types break.

## Domains & key tables
- **Identity** — `users`, `sessions`, `artists`, `artistAccounts`, `artistSessions`,
  `artistOnboardingRequests`. See [[auth]], [[artist]], [[user]].
- **Catalog** — `genres`, `albums`, `tracks`, `albumTracks`. Tracks carry an upload
  `status` (`draft`/`uploaded`/`ready`/…); only `uploaded`/`ready` are playable. See
  [[track]], [[album]].
- **Engagement** — `trackStats`.
- **User library** — `playlists`, `playlistTracks`, `userFavorites`. See [[playlist]].
- **Finance** — `purchases` (and future subscription/funding ledger). See
  [[subscription-and-purchase]].
- **Content** — `posts`, `contentMedia`, `postMedia`, `postMusicAttachments`,
  `postPolls`/`postPollOptions`/`postPollVotes`, `photoAlbums`, `photos`, `videos`,
  `videoCollections`/`videoCollectionItems`, `artistFeedItems`. Separate tables per
  content type ([[specific-content-tables]]); see [[post]], [[gallery]], [[video]],
  [[artist-feed-item]].

## Access layers
`src/lib/db/queries.ts` (static class services: `UserService`, `ArtistService`,
`TrackService`, `AlbumService`, `AnalyticsService`, …) → `src/lib/db/services/*`
(feature services) → application boundaries ([[service-boundaries]]). Wrap notable
operations in `withDbLogging()`.

## Workflow
Edit domain schema → update `schema.ts` aggregator + relations + types →
`yarn db:generate` → review SQL in `drizzle/migrations/` → `yarn db:migrate`. Local
DB setup in [[local-development]].

This is the **canonical** core; high-volume/flexible data moves to other stores per
[[system-design]].
