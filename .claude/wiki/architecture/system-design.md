---
title: System Design & Storage Strategy
type: architecture
tags: [architecture, storage, polyglot, scale, core]
status: current
sources: [pdm-system-design]
updated: 2026-06-30
---

# System Design & Storage Strategy

PDM is designed as a **polyglot storage system** for eventual global scale (tens of
millions of artists, hundreds of millions of users, hot spikes around releases).
PostgreSQL is the canonical relational core but must **not** become the store for
every high-volume or flexible access pattern.

## Principle

Do not split databases by fashion — split by **bounded context and access
pattern**. Stable rules:
- Postgres = canonical relational truth + authorization-sensitive metadata.
- NoSQL/document/wide-column = flexible documents + high-volume engagement.
- Object storage + CDN = media delivery.
- Feed, search, recommendations, analytics, comments, chat = rebuildable,
  read-optimized systems — **not** live joins over canonical tables.
- Service boundaries and repository interfaces matter more than the first physical
  DB choice ([[service-boundaries]], [[microservice-readiness]]).

## Storage by domain

| Domain | Storage |
|---|---|
| Identity & accounts (users, artists, accounts, sessions, roles, auth) | PostgreSQL — strong consistency, authz, audit. See [[auth]]. |
| Music catalog (tracks, albums, genres, rights, status) | PostgreSQL + object storage/CDN for audio/covers. See [[data-model]], [[media-storage]]. |
| Playback / listening events | Event stream (Kafka/Redpanda/NATS) + OLAP (ClickHouse/BigQuery); Redis for live session state. **Not** primarily Postgres. Feeds royalties, recs, analytics, fraud, charts. |
| User library & playlists | PostgreSQL first, later a sharded Library Service (partition by `user_id`, cursor pagination). See [[playlist]]. |
| Artist content metadata | PostgreSQL (authz-sensitive). See [[post]], [[specific-content-tables]]. |
| Post body / flexible documents | Postgres JSONB now behind [[post-document-repository]]; document store (MongoDB) later. |
| Feed | Dedicated read models (Redis hot pages; Cassandra/Scylla/DynamoDB timelines). Never built by live scans. |
| Likes / reactions | Canonical state store + separate counters (eventually consistent). Never `count(*)` per page. |
| Comments | Separate Comments/Engagement service from the start; partition `content_id + bucket`. |
| Live fan chat | Real-time transport (Redis Streams/Kafka/NATS) + history store; presence is ephemeral. |
| Recommendations | Event stream + analytics + vector/search; rank from read models, not request-time DB. |
| Search | Search engine (OpenSearch/Elasticsearch; Meilisearch early). Event-driven index updates. |
| Payments, subscriptions, funding | PostgreSQL + append-only **ledger**; strongly consistent, auditable; isolated from social data. See [[subscription-and-purchase]]. |

## Platform storage map (long-term)

Postgres (identity, catalog, subscriptions, content metadata, canonical playlists,
financial state) · Object storage + CDN (audio, images, video, variants) · Document
store (post bodies, drafts, early comments) · Redis (cache, rate limits, presence,
hot counters) · ClickHouse/OLAP (events, analytics, recs) · Search engine · Event
bus (outbox → broker) · Scylla/Cassandra/DynamoDB later (massive comments, chat, hot
feeds).

## Migration

Don't rush into every database. Prepare by keeping clean boundaries, avoiding direct
DB access from UI/routes, using repository interfaces and outbox events, stable IDs
(UUIDv7/ULID/Snowflake), and cursor pagination from day one. Phased plan in
[[roadmap-phases]]; content-specific detail in [[content-and-scale-strategy]].

**Key decision:** design the code so moving post bodies, comments, feeds, and chat
later does **not** require rewriting the product — see [[polyglot-storage]].
