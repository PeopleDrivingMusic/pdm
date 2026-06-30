---
title: Album
type: entity
tags: [entity, album, catalog, music]
status: current
sources: [claude-md, database, studio-music-spec]
updated: 2026-06-30
---

# Album

A release grouping of [[track]]s (`albums`), owned by an [[artist]]. Many-to-many to
tracks via `albumTracks` (a track may belong to an album and also stand alone).

Fields: cover, description, title, release date, genres, status. Covers stored in
R2 `images` ([[media-storage]]); metadata in Postgres ([[data-model]]). Managed in
[[studio-music]]; can be attached to a [[post]] via `postMusicAttachments`. Albums
are purchasable/ownable in the finance domain ([[subscription-and-purchase]]).
