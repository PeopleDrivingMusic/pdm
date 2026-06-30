---
title: Playlist
type: entity
tags: [entity, playlist, library]
status: current
sources: [database, pdm-system-design]
updated: 2026-06-30
---

# Playlist

User library data: personal playlists and saved/liked tracks.

- **`playlists`** — owned by a [[user]].
- **`playlistTracks`** — ordered membership (explicit ordering fields).
- **`userFavorites`** — liked/saved [[track]]s.

Postgres now; the long-term plan is a sharded **Library Service** partitioned by
`user_id` with cursor-based pagination ([[system-design]]). Playlists require
ownership, ordering, and consistency, so they stay in the canonical store while
high-volume engagement does not.
