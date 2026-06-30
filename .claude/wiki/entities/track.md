---
title: Track
type: entity
tags: [entity, track, catalog, music]
status: current
sources: [claude-md, database, studio-music-spec]
updated: 2026-06-30
---

# Track

A single piece of music in the catalog (`tracks`), owned by an [[artist]], optionally
in an [[album]] (via `albumTracks`).

- Audio metadata, genres (`genres`), publish/upload `status`
  (`draft`/`uploaded`/`ready`/…) — only `uploaded`/`ready` are playable
  (`playableTrackStatus()`).
- Audio files in Cloudflare R2 `music` bucket ([[media-storage]]); metadata in
  Postgres ([[data-model]]).
- Stats in `trackStats`; play/like/save surfaced in [[studio-music]].

A track is more than audio — it anchors stories, posts, polls, and funding
([[track-release-context]]). Content references tracks via `postMusicAttachments`
rather than duplicating them ([[post]]). Future revenue-share shares attach at track
level ([[revenue-share-crowdfunding]]). Listening events drive
[[user-centric-royalties]].
