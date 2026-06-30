---
title: Content Media
type: entity
tags: [entity, media, content]
status: current
sources: [claude-md, studio-content-spec]
updated: 2026-06-30
---

# Content Media

`contentMedia` is the shared media record for artist content — uploaded
images/files owned by an [[artist]] and referenced by content surfaces:

- attached to a [[post]] via `post_media`;
- used as photos in a [[gallery]] (`photos.mediaId`);
- referenced as a post cover (`cover_media_id`).

Binary files live in Cloudflare R2 ([[media-storage]]); `contentMedia` holds the
canonical metadata in Postgres ([[data-model]]). Issued/finalized through the Media
seam ([[service-boundaries]]).
