# PDM Content Microservice And Scale Strategy

Date: 2026-06-11

## Why This Matters

Content is not just a Studio tab. It is one of the core product surfaces of PDM:

- artist posts;
- polls;
- attached music;
- photo albums;
- video playlists;
- future comments, fan chats, reactions, exclusives, merch, and funding context.

The strategic rule remains: PDM must stay music-first. Content exists around artists, releases, tracks, fan relationships, and direct support. It should not become a generic social network.

## Current Direction

For now, keep Content inside the monolith, but treat it as a modular service.

The correct shape is:

- Svelte UI talks to SvelteKit server routes/actions.
- Routes/actions talk to a Content application boundary.
- The application boundary talks to DB services.
- DB services own schemas, transactions, feed updates, and storage details.

This gives us a clean future migration path:

- replace the in-process Content application boundary with an HTTP/gRPC client;
- keep Studio UI mostly unchanged;
- keep route contracts stable;
- move storage, feed building, media processing, and analytics independently later.

## Future Service Boundaries

Long-term, Content should split into several services:

- Content Service: posts, polls, visibility, content metadata, albums, playlists.
- Media Service: uploads, transcoding, image variants, video processing, CDN metadata.
- Feed Service: fan home feed, artist page feed, fanout, ranking, read models.
- Engagement Service: reactions, comments, saves, votes.
- Community Service: fan chats, subscriber-only rooms, moderation.
- Search Service: searchable artist content, videos, albums, posts.
- Notification Service: published content fan notifications.
- Analytics Service: impressions, engagement, conversion, subscriber impact.

Do not put all of this into one giant table or one giant service. The stable thing is the contract between services, not the internal storage.

## Scale Math

Hypothesis:

- 80,000,000 artists.
- Each artist posts 3 times per week.

That is:

- 240,000,000 content writes per week.
- About 34,300,000 writes per day.
- About 397 writes per second on average.

Writes are meaningful, but reads are the real problem:

- fan feeds;
- artist pages;
- notifications;
- media delivery;
- comments;
- polls;
- celebrity fan spikes after releases.

The platform should optimize for read amplification, hot artists, and media delivery before pretending that raw post creation is the hardest part.

## Sharding Warning

Sharding only by `artist_id` is dangerous.

It looks natural because content belongs to artists, but it creates a hot-shard problem:

- a superstar artist can concentrate huge read/write/comment/vote traffic on one shard;
- the "Metallica shard" becomes overloaded;
- long-tail artist shards stay cold;
- moving that artist later becomes operationally painful.

So `artist_id` can be an ownership key, but it should not be the only scaling key for read-heavy surfaces.

## Recommended Partitioning Model

Use different partition keys for different access patterns.

### Ownership Writes

For canonical content records:

- start with `artist_bucket = hash(artist_id) % N`;
- keep artist-owned writes predictable;
- make artist Studio operations simple.

This is acceptable for the canonical write model, but not enough for fan-scale reads.

### Public Artist Content Reads

For artist page timelines:

- partition by `artist_id + time_bucket`;
- use cursor pagination, not offset pagination;
- cache first pages heavily;
- keep denormalized feed cards separate from canonical post bodies.

For hot artists:

- route to dedicated hot partitions;
- split by `artist_id + time_bucket + content_bucket`;
- use CDN and edge cache for first-page reads;
- precompute public profile/feed snapshots.

### Fan Feeds

Do not serve fan feeds by scanning followed artists live.

Use read models:

- inbox/feed partitioned by `user_id` or `fan_bucket`;
- fanout on publish for normal artists;
- fanout-on-read or hybrid fanout for superstars;
- cache recent celebrity posts globally.

This avoids one superstar publish causing impossible write fanout to all fans.

### Comments And Chats

Comments and chats are more likely to become hot than post creation.

Partition by:

- `content_id + comment_bucket`;
- `chat_room_id + time_bucket`;
- optionally `artist_id + fan_bucket` for subscriber-only fan rooms.

Use separate services for comments/chat so a celebrity live thread cannot slow down Studio content creation.

### Polls

Poll votes should not write into the post table.

Use:

- append-only vote events;
- per-option counters;
- idempotency by `poll_id + user_id`;
- hot poll counters stored separately from canonical poll metadata.

## Hot Artist Mode

The system should explicitly support "hot artist mode" instead of hoping uniform sharding works.

Triggers:

- follower/subscriber count;
- release week;
- unusual feed/read traffic;
- comment/vote velocity;
- playlist/video spike.

Behavior:

- move artist feed reads to dedicated partitions;
- pre-warm CDN and first-page caches;
- use hybrid fanout for notifications and feeds;
- increase read replicas;
- isolate comments/chats/polls from canonical content writes;
- apply stricter rate limits and anti-spam checks.

This is how we avoid the "Metallica shard" problem.

## Event Model

Content should publish domain events through an outbox table first, then a broker later.

Useful events:

- `content.post.created`
- `content.post.published`
- `content.post.updated`
- `content.post.deleted`
- `content.gallery.created`
- `content.gallery.published`
- `content.video.created`
- `content.video.published`
- `content.poll.created`
- `content.poll.voted`
- `content.media.attached`

Consumers:

- Feed Service;
- Notification Service;
- Search Service;
- Analytics Service;
- TrustScore/Fraud Service;
- Recommendation Service.

The route/action should not directly know who needs to react to a publish. It should create content; events should fan out the side effects.

## Data Rules

Use stable IDs that work across services:

- UUIDv7, ULID, or Snowflake-like IDs;
- avoid database-local assumptions for public IDs;
- include `artist_id`, `status`, `visibility`, and timestamps in records that need routing or access checks.

Use cursor pagination everywhere:

- `created_at + id`;
- `published_at + id`;
- no offset for large feeds.

Use idempotency keys for creation APIs:

- post creation;
- media upload finalization;
- poll vote;
- publish operation.

Use denormalized read models:

- artist feed item;
- fan feed card;
- notification card;
- search document;
- analytics event.

Canonical content should be correct. Read models should be fast and rebuildable.

## Migration Path

### Phase 1: Modular Monolith

- Keep current Postgres schema.
- Keep DB services internal.
- Add Content application boundary.
- Keep all Studio routes behind this boundary.
- Store product and architecture decisions in `.claude/business`.

### Phase 2: Outbox And Read Models

- Add `content.outbox_events`.
- Move feed item creation toward event consumers.
- Add idempotency keys for content creation.
- Add cursor APIs for public artist content.

### Phase 3: Extract Content Service

- Content application boundary becomes a remote client.
- Content Service owns canonical posts, albums, playlists, polls.
- Main app keeps auth/session and Studio UI.
- Media Service owns upload/transcoding.
- Feed Service owns fan and artist page read models.

### Phase 4: Hot Artist Infrastructure

- Add hot artist routing.
- Split celebrity read paths.
- Add fan-bucketed feed delivery.
- Isolate comment/chat/poll spikes.
- Add multi-region cache and CDN-first media delivery.

## Decision

Do not shard everything by `artist_id`.

Use `artist_id` for ownership and authorization, but scale reads and engagement with separate partition keys:

- `artist_id + time_bucket` for artist pages;
- `user_id` or `fan_bucket` for fan feeds;
- `content_id + bucket` for comments and polls;
- dedicated hot partitions for superstars.

This keeps PDM ready for both the long tail and superstar spikes without losing the product model: music-first artist hubs with content, community, and direct support around the artist.
