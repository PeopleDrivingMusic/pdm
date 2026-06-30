---
title: Decision — Specific content tables, not one generic table
type: decision
tags: [decision, content, data-model]
status: current
sources: [studio-content-spec]
updated: 2026-06-30
---

# Decision — Specific content tables, not one generic table

**Context.** Posts, polls, photo albums, videos, and merch have different behavior
and fields.

**Decision.** Use specific tables per content surface (`posts`, `photo_albums`,
`photos`, `videos`, poll tables) plus a small shared projection
([[artist-feed-item]]) for unified previews/calendar. Do **not** use one large
`content_items` table.

**Alternatives.** A single `content_items` table with a `type` column and many
nullable fields.

**Consequences.** Each public view reads its own table (no `WHERE type = ...` over a
broad nullable table); the model stays clean and queryable. Cost: more tables and a
projection to maintain. Aligns with the product rule against a generic feed
([[positioning]]) and supports per-surface scaling ([[content-and-scale-strategy]]).
