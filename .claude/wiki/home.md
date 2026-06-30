---
title: PDM Wiki — Home
type: overview
tags: [overview, moc]
status: current
sources: [pdm-concept-v1, pdm-positioning, pdm-system-design]
updated: 2026-06-30
---

# PDM — People Driving Music

**PDM is a music-first fandom platform.** Everything is built around music and
musical content. Anyone can listen for free; a fan who wants more subscribes to a
specific artist for **$1/month** to unlock exclusive content and platform perks.
PDM's bet: move the industry from *"pay per number of plays"* to *"build and
monetize a loyal fan base."*

> Spotify owns listening. Instagram owns attention. PDM owns music fandom.

The core mechanics today are **listening**, a **content & social layer** around
artists, and **recommendations**. A later phase adds **fintech** (royalty
crowdfunding, merch, crypto payouts). See [[positioning]] for the category bet and
[[economic-model]] for how the money works.

## Map of content

### Strategy — why PDM exists and how it wins
- [[positioning]] — music-first fandom; differentiation vs Spotify/YouTube/IG.
- [[economic-model]] — $1 subscription, 80/20 split, user-centric royalties.
- [[roadmap-phases]] — the safe rollout sequence (streaming → … → crowdfunding).

### Product — what users and artists experience
- [[surfaces-overview]] — the core product surfaces.
- [[artist-page]] — the artist hub ("home base").
- [[track-release-context]] — a track is more than an audio file.
- [[fan-features]] — what a paying fan unlocks.
- [[studio-overview]] — the artist Studio (Dashboard, Music, Content, …).
- [[studio-music]] · [[studio-content]] — the two built-out Studio surfaces.
- [[design-system]] — tokens, themes, UI primitives.

### Architecture — how it is built and scales
- [[system-design]] — polyglot storage strategy and storage map.
- [[content-and-scale-strategy]] — microservice boundaries, sharding, hot artists.
- [[data-model]] — Postgres canonical schema and entities.
- [[service-boundaries]] — application-service seams for future extraction.
- [[auth]] — dual session systems (listener vs artist).
- [[media-storage]] — Cloudflare R2 audio/image delivery.
- [[observability]] — logging and metrics stack.
- [[local-development]] — running PDM locally.

### Concepts (glossary)
- [[artist-subscription]] · [[user-centric-royalties]] · [[fan-base-monetization]]
- [[revenue-share-crowdfunding]] · [[loyalty-tiers]] · [[trustscore]]
- [[artist-grades]] · [[persistent-music-layer]]

### Entities
- [[artist]] · [[user]] · [[track]] · [[album]] · [[post]] · [[gallery]]
- [[video]] · [[playlist]] · [[artist-feed-item]] · [[subscription-and-purchase]]

### Decisions (ADR)
- [[dual-auth-sessions]] · [[polyglot-storage]] · [[microservice-readiness]]
- [[specific-content-tables]] · [[post-document-repository]]
- [[shard-not-only-by-artist-id]] · [[defer-investment-layer]]

### Buckets
- [[ideas-about|Ideas]] · [[marketing-about|Marketing]]

---
Navigation: [[index]] (full catalog) · [[log]] (history) · `WIKI.md` (how this
wiki is maintained).
