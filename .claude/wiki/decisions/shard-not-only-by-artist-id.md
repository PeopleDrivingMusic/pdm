---
title: Decision — Don't shard everything by artist_id
type: decision
tags: [decision, scale, sharding]
status: current
sources: [pdm-content-microservice]
updated: 2026-06-30
---

# Decision — Don't shard everything by `artist_id`

**Context.** Content belongs to artists, so `artist_id` looks like the natural shard
key.

**Decision.** Use `artist_id` for **ownership and authorization**, but scale reads
and engagement with **separate partition keys**: `artist_id + time_bucket` for artist
pages, `user_id`/`fan_bucket` for fan feeds, `content_id + bucket` for comments/polls,
and dedicated hot partitions for superstars. See [[content-and-scale-strategy]].

**Alternatives.** Shard everything by `artist_id`.

**Consequences.** Avoids the "Metallica shard" hot-shard problem (a superstar
concentrating read/write/comment traffic on one shard while long-tail shards stay
cold, and painful later migration). Cost: more partitioning machinery and read
models. Enables [[content-and-scale-strategy|hot-artist mode]] for both the long tail
and superstar spikes.
