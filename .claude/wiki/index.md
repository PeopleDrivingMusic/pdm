---
title: Wiki Index
type: overview
tags: [index, catalog]
status: current
updated: 2026-06-30
---

# Wiki Index

Catalog of every page, grouped by category. Read this first when answering a query,
then drill into the relevant pages. Maintenance rules in `WIKI.md`.

## Overview
- [[home]] — PDM in one page + Map of Content.
- [[index]] — this catalog.
- [[log]] — chronological history of the wiki.

## Strategy
- [[positioning]] — music-first fandom; differentiation; target wedge; risks.
- [[economic-model]] — $1 subscription, 80/20, user-centric royalties, payouts.
- [[roadmap-phases]] — product rollout sequence + technical migration phases.

## Product
- [[surfaces-overview]] — the core product surfaces.
- [[artist-page]] — the artist hub / home base and its public views.
- [[track-release-context]] — a track is more than an audio file.
- [[fan-features]] — what a paying fan unlocks.
- [[studio-overview]] — artist Studio surfaces (Dashboard/Music/Content/Community/Analytics/Wallet).
- [[studio-music]] — catalog management MVP and per-track economics.
- [[studio-content]] — content production center (posts/polls/galleries/videos).
- [[design-system]] — tokens, themes, mixins, UI primitives.

## Architecture
- [[system-design]] — polyglot storage principle and per-domain storage map.
- [[content-and-scale-strategy]] — service boundaries, scale math, sharding, hot-artist mode, events.
- [[data-model]] — Postgres/Drizzle domain-split schema and access layers.
- [[service-boundaries]] — application-service extraction seams in code.
- [[auth]] — dual session systems (listener vs artist).
- [[media-storage]] — Cloudflare R2 audio/image delivery and uploads.
- [[observability]] — logging + metrics stack.
- [[local-development]] — running PDM locally (DB, app, tests, monitoring).

## Concepts
- [[artist-subscription]] — $1/mo per-artist subscription and perks.
- [[user-centric-royalties]] — per-user listening-time royalty split.
- [[fan-base-monetization]] — the key shift from plays to fan base.
- [[revenue-share-crowdfunding]] — phase-2 track-share investment.
- [[loyalty-tiers]] — app-wide perks from total fan spend.
- [[trustscore]] — two-sided reputation / bot protection.
- [[artist-grades]] — Newbie→Active→Creator gating.
- [[persistent-music-layer]] — music keeps playing while exploring.

## Entities
- [[artist]] · [[user]] · [[track]] · [[album]] · [[post]] · [[content-media]]
- [[gallery]] · [[video]] · [[playlist]] · [[artist-feed-item]] · [[subscription-and-purchase]]

## Decisions (ADR)
- [[dual-auth-sessions]] — two parallel session systems.
- [[polyglot-storage]] — Postgres canonical + purpose-fit stores.
- [[microservice-readiness]] — modular monolith, ready to split.
- [[specific-content-tables]] — per-type tables, not one generic table.
- [[post-document-repository]] — post body behind a repository interface.
- [[shard-not-only-by-artist-id]] — avoid the hot-shard problem.
- [[defer-investment-layer]] — ship funding last, behind legal structure.

## Buckets
- [[ideas-about]] — interesting ideas to keep (empty).
- [[marketing-about]] — analytics, campaigns, growth plans (empty).
