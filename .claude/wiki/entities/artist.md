---
title: Artist
type: entity
tags: [entity, artist, identity]
status: current
sources: [claude-md, database, pdm-system-design]
updated: 2026-06-30
---

# Artist

The public profile of a music creator. Distinct from the credential record.

- **`artists`** — public profile, linked 1:1 to a [[user]] (`userId`). Owns
  [[track]]s, [[album]]s, [[post]]s, [[gallery]]s, [[video]]s, and
  [[artist-feed-item]]s.
- **`artistAccounts`** — credential record(s) for Studio login; one artist → many
  accounts.
- **`artistSessions`** — Studio sessions (cookie `artist_session`); see [[auth]].
- **`artistOnboardingRequests`** — requests to become an artist.

Progression and trust gate financial mechanics: [[artist-grades]] (Newbie → Active →
Creator) and [[trustscore]]. Artists work from the [[studio-overview]]. `artist_id`
is an ownership/authz key but **not** the only scaling key — see
[[shard-not-only-by-artist-id]].
