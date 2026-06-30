---
title: Artist Feed Item (projection)
type: entity
tags: [entity, feed, projection, content]
status: current
sources: [studio-content-spec]
updated: 2026-06-30
---

# Artist Feed Item (projection)

`artist_feed_items` is **not** a source of truth — it is a lightweight
projection/index over the real content tables, used for:

- artist public feed previews;
- Studio "All" view;
- calendar and scheduling;
- pinned items;
- cross-type sorting and fast preview cards.

Fields (preview-only): `id`, `artist_id`, `source_type`
(`post | photo_album | video | track | album | merch`), `source_id`, `title`,
`preview_text`, `cover_url`, `visibility`, `status`, `published_at`,
`scheduled_at`, `pinned`, timestamps.

It exists so each public view can read its own table ([[post]], [[gallery]],
[[video]], catalog) while the overview/feed reads this index — avoiding
`WHERE type = ...` over a generic table ([[specific-content-tables]]). At scale this
becomes a denormalized, rebuildable feed read model ([[content-and-scale-strategy]]).
