---
title: Product Surfaces Overview
type: product
tags: [product, surfaces, overview, core]
status: current
sources: [pdm-system-design, pdm-positioning]
updated: 2026-06-30
---

# Product Surfaces Overview

The core product surfaces, all organized around artists/music (never a generic
social feed — see [[positioning]]):

- **Music catalog + persistent player** — the gravity well ([[persistent-music-layer]]).
- **Artist pages** — the hub / home base ([[artist-page]]).
- **Artist content** — posts, photos, videos, polls, and exclusives ([[studio-content]]).
- **Fan feed** — music-native, organized around followed artists, not random users.
- **Social layer** — likes, comments (paid-only), reactions.
- **Personal playlists** — user library ([[playlist]]).
- **Recommendations** — from behavioral events, not live DB joins.
- **Live fan chat** — subscriber-only rooms on artist pages.
- **Direct support** — subscriptions now; future funding/ownership later.

Each surface maps to a storage strategy in [[system-design]] and a future service
boundary in [[content-and-scale-strategy]]. A track itself is a rich surface, not
just audio — see [[track-release-context]]. What a paying fan unlocks is in
[[fan-features]].
