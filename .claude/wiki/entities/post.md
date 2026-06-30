---
title: Post (+ polls, media, music)
type: entity
tags: [entity, post, content, polls, tiptap]
status: current
sources: [studio-content-spec, pdm-system-design, claude-md]
updated: 2026-06-30
---

# Post (+ polls, media, music)

The primary artist content type (`posts`), authored in **Tiptap**.

Fields: `id`, `artist_id`, `title`, `slug`, `body_json` (canonical editor state),
`body_html` (sanitized render cache), `excerpt`, `cover_media_id`,
`visibility` (`public | followers | subscribers | investors`),
`status` (`draft | scheduled | published | archived`), `published_at`,
`scheduled_at`, `comments_enabled`, `reactions_enabled`, timestamps.

Related tables:
- **`post_media`** → [[content-media|contentMedia]] (attached images/files).
- **`post_music_attachments`** → references catalog [[track]]/[[album]] (never
  duplicates them — [[track-release-context]]).
- **`post_polls`** + `post_poll_options` + `post_poll_votes` — a poll **always**
  belongs to a post; votes live outside the Tiptap doc (Tiptap stores only
  `{ type: "poll", attrs: { pollId } }`); voting requires auth.

Body storage goes through [[post-document-repository]] (Postgres JSONB now). Posts
project into [[artist-feed-item]] for previews. Visibility maps to fan entitlements
([[fan-features]]). Authored in [[studio-content]]; scaled per
[[content-and-scale-strategy]].
