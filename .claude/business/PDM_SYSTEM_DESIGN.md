# PDM System Design And Storage Strategy

Date: 2026-06-13

## Context

PDM is a music-first fandom platform, not a generic social network.

Core product surfaces:

- music catalog and persistent player;
- artist pages;
- artist posts, photos, videos, polls, and exclusives;
- fan feed;
- social layer: likes, comments, reactions;
- personal playlists;
- recommendations;
- live fan chat on artist pages;
- direct support and future funding/ownership mechanics.

The long-term target can be global scale:

- tens of millions of artists;
- hundreds of millions of users;
- frequent artist content publishing;
- hot artist spikes around releases, videos, posts, chats, and polls.

The platform should be designed as a polyglot storage system. PostgreSQL remains the canonical relational core, but it must not become the storage for every high-volume or flexible access pattern.

## Principle

Do not split databases by fashion. Split by bounded context and access pattern.

Stable rules:

- PostgreSQL stores canonical relational truth and authorization-sensitive metadata.
- NoSQL/document/wide-column stores flexible documents and high-volume engagement surfaces.
- Object storage and CDN own media delivery.
- Feed, search, recommendations, analytics, comments, and chat are rebuildable/read-optimized systems, not live joins over canonical tables.
- Service boundaries and repository interfaces matter more than the first physical database choice.

## 1. Identity And Accounts

Recommended storage: PostgreSQL.

Owns:

- users;
- artists;
- artist accounts;
- sessions;
- roles;
- permissions;
- auth state;
- basic follow/subscription references.

Why PostgreSQL:

- strong consistency;
- transactional updates;
- relational ownership;
- authorization checks;
- auditability.

## 2. Music Catalog

Recommended storage: PostgreSQL plus object storage/CDN.

PostgreSQL owns:

- tracks;
- albums;
- releases;
- genres;
- artist ownership;
- audio metadata;
- publish status;
- rights and ownership references.

Object storage/CDN owns:

- original audio files;
- transcoded audio variants;
- cover images;
- future video/audio previews.

Why:

- catalog metadata is structured and relational;
- audio delivery is media infrastructure, not database traffic.

## 3. Playback And Listening Events

Recommended storage: event stream plus OLAP.

Candidates:

- Kafka/Redpanda/NATS for event transport;
- ClickHouse/BigQuery/Snowflake-like OLAP for analytics;
- Redis only for short-lived current playback/session state.

Events:

- play started;
- play completed;
- listening duration;
- skip;
- replay;
- queue action;
- device/session;
- country/region;
- user or anonymous listener id;
- track id.

Used by:

- royalty accounting;
- recommendations;
- artist analytics;
- fraud detection;
- charts.

Do not store listening events primarily in PostgreSQL.

## 4. User Library And Personal Playlists

Recommended storage: PostgreSQL first, later sharded Library Service.

Owns:

- user playlists;
- playlist tracks;
- saved tracks;
- liked tracks;
- recently played lightweight state.

Partitioning later:

- by `user_id`;
- cursor-based playlist pagination;
- explicit ordering fields for playlist tracks.

Reasoning:

- playlists require ownership, ordering, and consistency;
- early PostgreSQL is fine;
- long-term service boundary should allow moving library data independently.

## 5. Artist Content Metadata

Recommended storage: PostgreSQL.

Owns canonical metadata:

- post id;
- artist id;
- content type;
- title;
- slug;
- status;
- visibility;
- published at;
- scheduled at;
- moderation state;
- cover media id;
- attached track and album references;
- poll metadata;
- gallery metadata;
- video metadata.

Why:

- content visibility and ownership are authorization-sensitive;
- artist content links to catalog, subscriptions, and future funding;
- publish/update/delete flows need correctness.

Important:

- PostgreSQL should not be the only place that all body, comments, counters, and feed data live.
- Keep Content application boundary stable so storage can move later.

## 6. Post Body And Flexible Content Documents

Recommended storage: PostgreSQL JSONB now through an adapter, MongoDB/document store later if needed.

Owns:

- Tiptap JSON;
- rich body;
- widget layout;
- draft snapshots;
- optional edit history;
- flexible post blocks.

Architecture rule:

- code should use `PostDocumentRepository`;
- current adapter may store documents in PostgreSQL JSONB;
- future adapter can store documents in MongoDB or another document store.

Example boundary:

```ts
interface PostDocumentRepository {
  getPostDocument(postId: string): Promise<PostDocument | null>;
  savePostDocument(postId: string, document: PostDocument): Promise<void>;
  deletePostDocument(postId: string): Promise<void>;
}
```

Why:

- MongoDB can be useful for flexible post bodies and drafts;
- moving later is much easier if the application already treats body storage as a separate document repository.

## 7. Feed

Recommended storage: dedicated feed read models.

Candidates:

- Redis for hot first pages and short-lived cache;
- Cassandra/Scylla/DynamoDB-style storage for massive timelines;
- PostgreSQL only for early prototype read models.

Owns:

- denormalized feed cards;
- fan home feed;
- artist page feed;
- ranking signals;
- pagination cursors.

Partitioning:

- artist page feed: `artist_id + time_bucket`;
- fan feed: `user_id` or `fan_bucket`;
- hot artists: dedicated hot partitions and cached first pages.

Rules:

- do not build feed by scanning followed artists live;
- do not serve fan feeds through joins over posts, follows, comments, and music tables;
- feed is a rebuildable read model, not source of truth.

## 8. Social Layer: Likes And Reactions

Recommended storage: canonical event/state store plus counter store.

Candidates:

- PostgreSQL or DynamoDB/Scylla for canonical user reaction state;
- Redis or aggregated counters for hot counts;
- ClickHouse for analytics.

Owns:

- user reacted to content;
- reaction type;
- content id;
- created at;
- counters per content.

Rules:

- never count likes through `count(*)` on every page load;
- keep user-specific reaction state separate from public counters;
- counters can be eventually consistent.

## 9. Comments

Recommended storage: separate Comments/Engagement Service from the start.

Candidates:

- MongoDB for document-style comment threads;
- Scylla/Cassandra/DynamoDB-style model for very high scale;
- PostgreSQL only as early implementation behind `CommentService`.

Owns:

- comment id;
- content id;
- comment bucket;
- parent id;
- user id;
- body;
- moderation status;
- created at;
- edited at;
- deleted/tombstone state.

Partitioning:

- `content_id + comment_bucket`;
- for hot content, split by time bucket or hash bucket;
- do not embed all comments inside the post document.

Rules:

- comments can become hotter than posts;
- comment storms must not slow Studio content creation;
- comments should be paginated with cursors;
- moderation and spam controls belong near comments.

## 10. Live Fan Chat

Recommended storage: real-time transport plus chat history store.

Candidates:

- Redis Streams, Kafka, Redpanda, or NATS for real-time message flow;
- Redis for presence;
- Scylla/Cassandra/DynamoDB/MongoDB for chat history.

Owns:

- room id;
- artist id;
- message id;
- user id;
- message body;
- created at;
- moderation flags;
- subscriber/fan-room access state.

Partitioning:

- `room_id + time_bucket`;
- for hot rooms: `room_id + time_bucket + message_bucket`.

Rules:

- live chat must be separate from posts and comments;
- presence is ephemeral and should not live in PostgreSQL;
- hot fan rooms need independent scaling.

## 11. Recommendations

Recommended storage: event stream, analytics store, vector/search/index layer.

Candidates:

- Kafka/Redpanda/NATS for events;
- ClickHouse/BigQuery for behavioral analytics;
- OpenSearch/Elasticsearch or vector DB for embeddings/search;
- feature store later.

Inputs:

- listening events;
- skips;
- likes;
- saves;
- follows;
- subscriptions;
- comments;
- chat activity;
- artist similarity;
- track/audio features;
- content embeddings.

Rules:

- recommendations should not depend on transactional DB queries at request time;
- train and rank from event/read models;
- keep recommendations explainable enough for artist/fan trust.

## 12. Search

Recommended storage: search engine.

Candidates:

- OpenSearch/Elasticsearch;
- Meilisearch for simpler early phase.

Indexes:

- artists;
- tracks;
- albums;
- posts;
- videos;
- playlists;
- possibly fan communities.

Rules:

- search documents are denormalized and rebuildable;
- PostgreSQL is not the search engine;
- index updates should be event-driven.

## 13. Payments, Subscriptions, Funding

Recommended storage: PostgreSQL plus ledger-oriented design.

Owns:

- subscription records;
- payment references;
- entitlements;
- future revenue-share/funding state;
- payout requests;
- financial audit records.

Rules:

- financial state must be strongly consistent and auditable;
- use append-only ledger patterns where money or rights are involved;
- do not mix high-volume social data with financial tables;
- future investment layer will require compliance, KYC/AML, rights accounting, and legal boundaries.

## Platform Storage Map

Minimal long-term storage set:

- PostgreSQL: identity, artists, music catalog, subscriptions, content metadata, canonical playlists, financial state.
- Object Storage + CDN: audio, images, video, variants, thumbnails.
- MongoDB or document store: flexible post bodies, drafts, possibly early comments.
- Redis: cache, rate limits, presence, hot counters, short-lived session/state.
- ClickHouse/OLAP: listening events, analytics, dashboards, recommendation data.
- Search Engine: artist/track/post/video/search indexes.
- Event Bus: outbox to broker for feed, notifications, analytics, recommendations, search.
- Scylla/Cassandra/DynamoDB-style storage later: massive comments, chat history, fan feeds, hot timelines.

## Migration Strategy

Do not rush into every database immediately.

Prepare now by:

- keeping application boundaries clean;
- avoiding direct DB access from UI/routes;
- using repository interfaces for document body, comments, feed, and reactions;
- adding outbox events for publish/update/delete/reaction/comment/vote;
- using stable IDs suitable across services;
- using cursor pagination from the beginning;
- keeping read models rebuildable.

Recommended early phases:

### Phase 1: Modular Monolith

- PostgreSQL for canonical data.
- JSONB for post body behind `PostDocumentRepository`.
- No comments directly embedded in posts.
- Content, Feed, Engagement, Community boundaries represented in code.

Implementation note:

- `src/lib/db/services/PostDocumentRepository.ts` is the current adapter boundary.
- The first implementation still stores post body in PostgreSQL, but create/update/delete/read flows should go through the repository.
- Future MongoDB/document-store migration should replace the adapter, not rewrite Studio routes, public artist pages, or content application services.

### Phase 2: Outbox And Read Models

- Add outbox events.
- Feed item creation moves toward event consumers.
- Add idempotency keys for content creation, publish, poll vote, comments.
- Start separating counters from canonical reaction records.

### Phase 3: Extract Hot Services

- Comments Service.
- Feed Service.
- Media Service.
- Recommendation pipeline.
- Search indexing pipeline.

### Phase 4: Hot Artist Infrastructure

- dedicated hot artist partitions;
- cached first page reads;
- hybrid fanout;
- isolated comments/chats/polls;
- multi-region cache/CDN strategy.

## Key Decision

PDM should use both PostgreSQL and NoSQL.

PostgreSQL is the canonical relational core.
NoSQL/document/wide-column systems should handle flexible documents, comments, chats, feed timelines, and hot engagement paths.

The important decision today is not to move everything to MongoDB immediately. The important decision is to design the code so moving post bodies, comments, feeds, and chat history later does not require rewriting the product.
