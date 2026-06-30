---
title: Gallery (photo albums)
type: entity
tags: [entity, gallery, photos, content]
status: current
sources: [studio-content-spec]
updated: 2026-06-30
---

# Gallery (photo albums)

A dedicated photo surface so the public [[artist-page]] has a real photo gallery
instead of a filtered generic table ([[specific-content-tables]]).

- **`photo_albums`** — artist ownership, title, slug, description, cover photo,
  visibility, status, published/scheduled timestamps.
- **`photos`** — album ownership, file URL, thumbnail URL, alt text, caption, sort
  order, metadata.

Images stored in R2 `images` ([[media-storage]]). Managed in [[studio-content]];
projects into [[artist-feed-item]] for previews.
