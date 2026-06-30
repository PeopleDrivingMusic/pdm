---
title: Content & Scale Strategy
type: architecture
tags: [architecture, scale, sharding, microservices, content, core]
status: current
sources: [pdm-content-microservice]
updated: 2026-06-30
---

# Content & Scale Strategy

Content is a **core product surface**, not a Studio tab: posts, polls, attached
music, photo albums, video playlists, and future comments/chats/reactions/merch/
funding. It must stay music-first ([[positioning]]).

## Current shape (modular monolith)
Svelte UI → SvelteKit routes/actions → **Content application boundary** → DB
services → storage. Keeping this boundary stable lets us later replace it with an
HTTP/gRPC client without rewriting Studio UI or route contracts
([[service-boundaries]], [[microservice-readiness]]).

## Future service boundaries
Content · Media · Feed · Engagement (reactions/comments/saves/votes) · Community
(fan chats) · Search · Notification · Analytics. The stable thing is the **contract
between services**, not internal storage.

## Scale math
Hypothesis: 80M artists × 3 posts/week ≈ 240M writes/week ≈ 34.3M/day ≈ ~397
writes/sec average. Writes matter, but **reads are the real problem** (fan feeds,
artist pages, notifications, media, comments, celebrity spikes). Optimize for read
amplification, hot artists, and media delivery first.

## Sharding & partitioning
- **Warning:** sharding only by `artist_id` creates the "Metallica shard" hot-shard
  problem — see [[shard-not-only-by-artist-id]]. Use `artist_id` for ownership/authz,
  not as the only scaling key.
- **Ownership writes:** `artist_bucket = hash(artist_id) % N`.
- **Public artist reads:** `artist_id + time_bucket`, cursor pagination, heavy
  first-page cache, denormalized feed cards separate from post bodies.
- **Fan feeds:** inbox partitioned by `user_id`/`fan_bucket`; fanout-on-publish for
  normal artists, hybrid/fanout-on-read for superstars. Never scan followed artists
  live.
- **Comments/chats:** `content_id + comment_bucket`, `chat_room_id + time_bucket`;
  separate services so a celebrity thread can't slow Studio.
- **Polls:** append-only vote events + per-option counters + idempotency
  `poll_id + user_id`; never write votes into the post table.

## Hot-artist mode
Explicitly supported (don't hope uniform sharding works). Triggers: follower count,
release week, traffic/comment/vote velocity. Behavior: dedicated feed partitions,
pre-warmed CDN/first-page cache, hybrid fanout, more read replicas, isolated
comments/chats/polls, stricter rate limits / anti-spam ([[trustscore]]).

## Event model (outbox → broker)
Events like `content.post.created/published/updated/deleted`,
`content.gallery.*`, `content.video.*`, `content.poll.created/voted`,
`content.media.attached`. Consumers: Feed, Notification, Search, Analytics,
TrustScore/Fraud, Recommendation. Routes create content; **events** fan out side
effects.

## Data rules
Stable cross-service IDs (UUIDv7/ULID/Snowflake); cursor pagination everywhere
(`created_at + id`); idempotency keys for creation APIs; denormalized, rebuildable
read models. Canonical content is correct; read models are fast.

Migration phases mirror [[roadmap-phases]] (monolith → outbox/read-models → extract
services → hot-artist infra).
