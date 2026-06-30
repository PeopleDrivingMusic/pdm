---
title: Studio — Content
type: product
tags: [product, studio, content, posts, polls, galleries, videos]
status: current
sources: [studio-content-spec, pdm-content-microservice]
updated: 2026-06-30
---

# Studio — Content

The artist's production center for posts, photo galleries, videos, and future
commerce surfaces. Goal: help artists publish content that converts listeners into
followers, subscribers, and investors — **without** turning the public artist page
into one generic feed ([[positioning]]).

## Domain model
Separate tables per content type (not one `content_items`) — see
[[specific-content-tables]]: [[post]] (+ `post_media`, `post_music_attachments`,
`post_polls`/options/votes), [[gallery]] (`photo_albums`, `photos`), [[video]], and
the [[artist-feed-item]] projection used for previews/calendar/pinning.

- **Posts** authored in **Tiptap**; `body_json` is canonical, `body_html` a sanitized
  render cache. Visibility: `public | followers | subscribers | investors`. Status:
  `draft | scheduled | published | archived`.
- **Polls** always belong to a post; votes stored outside the Tiptap doc (Tiptap
  keeps only a `{ type: "poll", attrs: { pollId } }` node). Voting requires auth.
- **Music attachments** reference catalog entities, never duplicate track data
  ([[track-release-context]]).

## Studio UX
Primary views: All · Posts · Photos · Videos · Scheduled · Drafts (optional
List/Calendar/Library switch). Actions: create post, create gallery, upload video,
schedule, publish, duplicate, archive. Editor layout: center editor; top toolbar +
status; right publish/visibility/schedule/tags/preview.

## Architecture rules
- Server-first: all writes go through SvelteKit server actions / server-only
  services; clients never write to the DB or own business rules (publish perms,
  visibility, vote uniqueness, ownership).
- Service boundaries: `PostService`, `GalleryService`, `VideoService`, `PollService`,
  `ContentFeedService`, `ContentMediaService`, `ContentMetricsService` behind the
  Content application boundary ([[service-boundaries]]).
- Reuse `src/lib/ui` primitives and tokens ([[design-system]]).

Public views read their own tables (Posts→`posts`, Photos→albums/photos,
Videos→`videos`, Music→catalog), overview reads [[artist-feed-item]]. Scale/sharding
and the future Content/Media/Feed services are in [[content-and-scale-strategy]].
