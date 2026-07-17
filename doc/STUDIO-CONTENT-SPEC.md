# Studio Content specification

## Product goal

Studio Content is the artist's production center for posts, photo galleries, videos, and future commerce/content surfaces. It should help an artist publish content that converts listeners into followers, subscribers, and investors without turning the public artist page into one generic feed.

Public artist pages should keep clear views:

- Posts
- Music
- Photo gallery
- Video gallery
- Shop / merch, later

Studio can still provide an "All content" planning view, but the underlying domain model should keep separate entities for content types that have different behavior.

## Core modeling decision

Do not use one large `content_items` table for all content. It would become too broad and full of nullable fields for posts, videos, galleries, polls, and merch.

Use specific tables for specific content surfaces, plus a small shared feed/index table for unified planning and public feed previews.

Recommended model:

- `posts`
- `post_media`
- `post_music_attachments`
- `post_polls`
- `post_poll_options`
- `post_poll_votes`
- `photo_albums`
- `photos`
- `videos`
- `artist_feed_items`

`artist_feed_items` is not the source of truth for full content. It is a projection/index used for:

- artist public feed previews
- Studio "All" view
- calendar and scheduling
- pinned items
- cross-type sorting
- fast preview cards

It should contain only fields needed to list or preview an item:

- `id`
- `artist_id`
- `source_type`: `post | photo_album | video | track | album | merch`
- `source_id`
- `title`
- `preview_text`
- `cover_url`
- `visibility`
- `status`
- `published_at`
- `scheduled_at`
- `pinned`
- `created_at`
- `updated_at`

## Polls

Polls must always belong to a post.

A poll is not its own public content type. A post can be mostly empty textually and still be valid if it contains a poll, media, or music attachment.

Rules:

- `post_polls.post_id` is required.
- A post may contain zero or more polls, though MVP can limit this to one poll per post.
- Poll votes are stored outside the Tiptap document.
- Tiptap stores only a poll node reference, for example `{ type: "poll", attrs: { pollId } }`.
- Voting should require an authenticated user for reliable uniqueness.

This keeps interactive behavior queryable and auditable without parsing editor JSON.

## Posts and Tiptap

Tiptap should be used for post authoring.

`posts` should keep:

- `id`
- `artist_id`
- `title`
- `slug`
- `body_json`
- `body_html`
- `excerpt`
- `cover_media_id`
- `visibility`: `public | followers | subscribers | investors`
- `status`: `draft | scheduled | published | archived`
- `published_at`
- `scheduled_at`
- `comments_enabled`
- `reactions_enabled`
- `created_at`
- `updated_at`

`body_json` is the canonical editor state. `body_html` is a sanitized render cache for public reads.

Tiptap extensions to plan for:

- basic formatting
- links
- image/media embed
- gallery embed
- track embed
- album embed
- poll embed
- callout or announcement block

Attached music should reference existing catalog entities rather than duplicate track data inside the post.

## Photo galleries

Use `photo_albums` and `photos`.

`photo_albums`:

- artist ownership
- title
- slug
- description
- cover photo
- visibility
- status
- published/scheduled timestamps

`photos`:

- album ownership
- file URL
- thumbnail URL
- alt text
- caption
- sort order
- metadata

This lets the public artist page have a real photo gallery view instead of filtering a generic content table.

## Videos

Use a dedicated `videos` table.

Videos need fields that posts and photos do not:

- video URL
- thumbnail URL
- duration
- processing/transcoding status, later
- captions/subtitles, later
- visibility
- status
- published/scheduled timestamps

MVP can store uploaded video URLs without full transcoding, but the schema should leave room for processing state.

## Frontend architecture

The Studio Content frontend must use the existing design system.

Rules:

- Use existing UI primitives from `src/lib/ui` such as `Button`, `Tabs`, `FileUpload`, `Input`, `Select`, `Checkbox`, and `SvgIcon`.
- Do not hardcode the full experience inside `+page.svelte`.
- Page files should compose reusable components and wire server data/actions.
- New reusable UI should live in `src/lib/ui` when generic, or in a feature component folder when content-specific.
- Use theme tokens from `src/styles/tokens.css` and theme variables. Avoid one-off colors, spacing, radii, and shadows.

Recommended component decomposition:

- `src/routes/studio/content/+page.svelte`
- `src/routes/studio/content/+page.server.ts`
- `src/routes/studio/content/components/ContentShell.svelte`
- `src/routes/studio/content/components/ContentHeader.svelte`
- `src/routes/studio/content/components/ContentTypeTabs.svelte`
- `src/routes/studio/content/components/ContentList.svelte`
- `src/routes/studio/content/components/ContentListItem.svelte`
- `src/routes/studio/content/components/ContentCalendar.svelte`
- `src/routes/studio/content/components/PublishPanel.svelte`
- `src/routes/studio/content/components/PostEditor.svelte`
- `src/routes/studio/content/components/PostEditorToolbar.svelte`
- `src/routes/studio/content/components/PollBuilder.svelte`
- `src/routes/studio/content/components/MusicAttachmentPicker.svelte`
- `src/routes/studio/content/components/GalleryManager.svelte`
- `src/routes/studio/content/components/VideoManager.svelte`

Generic editor controls can become reusable UI components later:

- `src/lib/ui/Toolbar.svelte`
- `src/lib/ui/IconButton.svelte`
- `src/lib/ui/SegmentedControl.svelte`
- `src/lib/ui/StatusBadge.svelte`
- `src/lib/ui/EmptyState.svelte`

## Studio UX

The first screen should be an actual working management surface, not a marketing page.

Primary views:

- All
- Posts
- Photos
- Videos
- Scheduled
- Drafts

Optional view switch:

- List
- Calendar
- Library

Main actions:

- Create post
- Create photo gallery
- Upload video
- Schedule
- Publish
- Duplicate
- Archive

Editor layout:

- Center: post editor / gallery manager / video form
- Top: editor toolbar and status
- Right: publish settings, visibility, schedule, tags, preview
- Bottom or header actions: save draft, preview, schedule, publish

## Public UX

Public artist pages should expose clear tabs/views:

- Overview / feed
- Posts
- Music
- Photos
- Videos
- Shop, later

The overview/feed can read from `artist_feed_items`.

Specific views read their own tables:

- Posts view reads `posts`
- Photos view reads `photo_albums` and `photos`
- Videos view reads `videos`
- Music view reads existing catalog tables
- Shop view will read merch tables later

This avoids overusing `WHERE type = ...` on a generic table and keeps each page simple.

## Server-first architecture

All writes should go through SvelteKit server actions or server-only service functions.

Rules:

- Client components should not write directly to the database.
- Client components should not own business rules such as publish permissions, visibility, voting uniqueness, or artist ownership.
- Server actions validate artist session and ownership.
- Server services should sit between route actions and Drizzle queries.
- Upload, poll voting, feed indexing, metrics, and media processing should be designed as replaceable service boundaries.

Recommended service boundaries:

- `PostService`
- `GalleryService`
- `VideoService`
- `PollService`
- `ContentFeedService`
- `ContentMediaService`
- `ContentMetricsService`

This keeps the app ready for future microservice extraction. For example, media processing can move behind `ContentMediaService`, poll voting can move behind `PollService`, and analytics can move behind `ContentMetricsService` without rewriting UI components.

## MVP order

1. Add Drizzle schemas and migrations for posts, post attachments, polls, galleries, videos, and feed index.
2. Add server services for content creation and listing.
3. Build Studio Content list using existing design system components.
4. Add post creation/editing with Tiptap.
5. Add poll builder as a post block.
6. Add media upload through the existing `FileUpload` primitive and server upload logic.
7. Add track attachment picker from the artist's catalog.
8. Add public artist content tabs.
9. Add basic metrics and feed indexing.

Video upload can be introduced in MVP with simple file storage and a `processing_status` field reserved for later transcoding.
