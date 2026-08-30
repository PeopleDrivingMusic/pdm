# Seeded Artist Profiles (Audius) — Design

**Date:** 2026-08-29
**Branch:** `feat/seeded-artist-profiles` (off `origin/main` @ f71f3b5)
**Status:** Design approved in brainstorming; pending user review of this spec

## 1. Goal & Scope

Seed PDM with **unclaimed artist profiles imported from Audius**, so the platform is
not empty and a real artist arrives to a page that already has an audience. A seeded
page plays real music, carries an explicit "not official" notice plus a Claim CTA, and
runs PDM's **own** social layer (chat, comments, likes) on top of the imported catalog.

This is the first executable slice of `.claude/wiki/ideas/artist-page-seeding-and-claim.md`
(the "demand board").

### Locked decisions (brainstorming, 2026-08-29)

1. **Source is Audius, not Spotify.** Section 2 records why, so this is not re-litigated.
2. **One artist primitive.** Seeded artists live in `artist.artists` with an `origin`
   discriminator — not a parallel `external_artists` table. Same reasoning the wiki
   used for "one message primitive": a second table would force a duplicate copy of
   chat, comments, likes and subscriptions (all their FKs point at `artists.id`), and
   would turn claim into a data migration that re-parents live rows.
3. **Pre-claim subscription is free** (`subscriptions.kind = 'pre_claim_free'`) — no
   card, no Stripe in this scope. This is the founder's call and it **overrides** the
   wiki's pledge-with-card decision; consequences and required mitigations in section 8.
4. **Writing to a seeded chat requires clicking Subscribe. Reading it is open to
   everyone.** Subscribe stays the page's single conversion event (and the demand
   signal), while an openly readable room avoids the dead-page problem.
5. **Chat rate limit is per room** (hard) **plus a global per-user backstop** (soft).
6. **Badges are out of scope.** `artists.claimedAt` is stored anyway, because badges
   are then derivable from `subscriptions.startedAt < artists.claimedAt`.
7. **MusicBrainz is deferred.** Audius alone carries name, bio, avatar, banner and
   tracks. The adapter seam is designed for a second source; slice 1 ships one.

### Out of scope (explicitly)

- Search — showing external artists in search results.
- Taste import — Last.fm / ListenBrainz OAuth, liked tracks, listening history.
- Real claim **verification** and page handover. Only a "request claim" form ships here.
- Badges / fan-provenance UI.
- Stripe, payments, pledges.
- The MusicBrainz adapter implementation.

## 2. Why not Spotify (grounding — do not re-litigate)

Three independent blocks; the first two are mechanical, not matters of interpretation.

1. **No previews exist.** `preview_url` was removed for every app registered on or
   after 2024-11-27, along with audio-features, audio-analysis, recommendations and
   related-artists. PDM is a new app — there is nothing to fetch.
2. **25-user ceiling.** Development mode caps at 25 users. Extended Quota Mode requires
   a registered business **and 250k MAU**, followed by manual vetting that since
   2025-05-15 screens out apps replicating Spotify's own features. A music-social
   platform with subscriptions is precisely that profile.
3. **Developer Policy.** IV.2 bars commercial use. III.7 bars mixing Spotify Content
   with other audio — we stream our own from R2 on the same page. III.13 bars building
   user profiles and derived listenership metrics. II.4.3 bars offering metadata and
   cover art as a standalone product, which is exactly what a page built from Spotify
   metadata is.

**Deezer** keeps 30-second previews but its ToU restricts commercial use, and the
"page reads as official" problem is unchanged. **Cover Art Archive** images remain
copyrighted by their owners regardless of MusicBrainz's CC0 core data, so they are not
a banner source.

**Audius** fits, and the API was verified live on 2026-08-29 rather than taken from
docs — see section 3.1 for the exact responses. Free API, no key and no auth on the
endpoints we need; `cover_photo` and `profile_picture` are uploaded by the artist; the
stream endpoint serves `audio/mpeg` with `Range` support so it drops straight into the
existing `MusicPlayer`; and artists already carry a wallet bound to their profile, which
makes claim verification cheap when we get there.

One thing **not** to over-claim: the redirect comes back with `skip_play_count=true`
appended by Audius itself — on a plain `GET`, not only on a `Range` request. Plays routed
this way appear not to register at all. Reporting listens back to the artist is the
intent, but nothing here should be promised until it is measured.

## 3. Current State (grounding — verified in-repo 2026-08-29)

- `artist.artists.userId` is `NOT NULL` and FKs to `users.id` (`schemas/artist.ts:18`).
- Everything hangs off `artists.id`: `catalog.albums.artistId` (`catalog.ts:25`),
  `catalog.tracks.artistId` (`catalog.ts:46`), `content.posts.artistId`
  (`content.ts:24`, FK at `:42`), `finance.subscriptions.artistId` (`finance.ts:31`),
  `messages.chat.artistId` (`messages.ts:38`).
- `messages/access.ts:85-86` runs `const ownerUserId = artist?.userId;` then
  `if (!ownerUserId) return DENIED;`. `ArtistService.getArtistById` (`queries.ts:258`)
  is a bare id lookup with no `isActive` filter, and the FKs above are `notNull`
  without cascade — so a track or post without an artist is impossible and this guard
  **cannot currently fire**. It is dead code today, and becomes a feature-breaking
  guard the instant `userId` is nullable.
- Chat gates **read** at `ChatService.ts:72` and **write** at `:97`, both on
  `!isSubscriber && !isOwner`.
- Non-subscribers already receive a masked teaser:
  `maskChatEvent(event, viewerIsSubscriber)` (`broadcast.ts:28`), wired in
  `chat.remote.ts`. Opening a seeded room is therefore an argument change, not a new
  mechanism.
- `ChatService` has **no rate limiter** — only `MAX_MESSAGE_LENGTH` (`ChatService.ts:101`).
  Comments have one (`comments/rateLimits.ts`), keyed per user at
  `api/comments/+server.ts:65`.
- `createRateLimiter` (`security/rateLimiter.ts`) accepts an arbitrary string key in
  `check(key)`; it is in-memory per instance, with a 1024-entry prune threshold.
- `api/music/[id]/+server.ts:33` presigns **every** track through R2.
- **No email verification exists.** `users.isVerified` is in the schema, but nothing
  sets it. "Logged in" today means an unverified email + password, or Google.

### 3.1 The Audius API, verified live (2026-08-29)

Every endpoint below was called against the live API while writing this spec, not read
from documentation. Base host is `https://api.audius.co/v1` — the discovery-node list at
`https://api.audius.co` currently returns that single host. No key and no auth are
required; `app_name` is optional (a request without it still returns 200) but is sent by
convention.

| Call                             | Result                                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `GET /users/search?query=<name>` | 200. Full user objects                                                                                |
| `GET /users/{id}/tracks`         | 200. Track list                                                                                       |
| `GET /tracks/{id}/stream`        | **302** to a signed validator URL, then `206` with `accept-ranges: bytes`, `content-type: audio/mpeg` |
| `GET /tracks/search?query=<q>`   | 200 (not needed in this scope)                                                                        |

Fields we consume from a user: `id`, `handle`, `name`, `bio`, `profile_picture`
(1000×1000), `cover_photo` (2000× / 640×), `follower_count`, `track_count`,
`album_count`, `erc_wallet`, `twitter_handle`, `instagram_handle`, `is_verified`,
`is_deactivated`. From a track: `id`, `title`, `duration`, `genre`, `mood`,
`release_date`, `play_count`, `permalink`, `is_streamable`, `field_visibility`.

**The finding that shapes the import design.** Searching `deadmau5` returns _two_
accounts carrying that same display name:

| id      | handle         | `is_verified` | followers |
| ------- | -------------- | ------------- | --------- |
| `LKdlD` | `deadmau5`     | **true**      | 94,917    |
| `D8OGl` | `deadmau54321` | false         | 704       |

Auto-importing the top hit would eventually seed a page under a real artist's name built
out of an **impostor's** uploads — precisely the scenario the legal framing in section 7
exists to prevent. This is why `lookupArtist()` is a separate admin confirmation step and
not an automatic pipeline.

**Stream URLs are signed and expire.** `/tracks/{id}/stream` answers `302` to a validator
host with a `signature` carrying a timestamp. The resolved URL must therefore **never** be
stored or cached; see section 4.2.

## 4. Data Model

Per CLAUDE.md: edit the domain schema file, update the `schema.ts` aggregator,
relations and type exports, then `yarn db:generate`, review the SQL in
`drizzle/migrations/`, then `yarn db:migrate`. **Never `db:push`** against the shared
dev DB.

### 4.1 `artist.artists` (`schemas/artist.ts`)

| Column        | Change                                      | Notes                                                                            |
| ------------- | ------------------------------------------- | -------------------------------------------------------------------------------- |
| `userId`      | `NOT NULL` becomes **nullable**             | A seeded artist has no PDM user until claim                                      |
| `origin`      | new `varchar(16) NOT NULL DEFAULT 'native'` | `native` or `audius`                                                             |
| `externalId`  | new `varchar(64)`                           | The artist's id/handle in the source                                             |
| `externalUrl` | new `text`                                  | Link back to the source profile — required for attribution                       |
| `claimedAt`   | new `timestamp`                             | `NULL` = unclaimed. Not read in this scope; stored so badges are derivable later |

Partial unique index `artists_origin_external_unique` on `(origin, external_id)` where
`origin <> 'native'` — this is what makes import idempotent.

No separate `claimStatus` column: `userId IS NULL` and `claimedAt IS NULL` already say
everything. YAGNI.

### 4.2 `catalog.tracks` (`schemas/catalog.ts`)

| Column        | Change                                                     |
| ------------- | ---------------------------------------------------------- |
| `audioSource` | new `varchar(16) NOT NULL DEFAULT 'r2'` — `r2` or `audius` |
| `externalId`  | new `varchar(64)` — the track's id in the source           |

`audioUrl` is already `text`. For `audioSource = 'audius'` it holds the **stable**
endpoint `https://api.audius.co/v1/tracks/{externalId}/stream` — never the URL that
endpoint redirects to. That target is signed with a timestamp and expires, so a stored
copy would be a track that plays in testing and 403s a day later. The browser follows the
302 itself, which also means the audio element fetches from a validator host directly.

Imported tracks get `status='ready'`, `isPublished=true`, `visibility='public'`.

### 4.3 `finance.subscriptions` (`schemas/finance.ts`)

| Column | Change                                                                 |
| ------ | ---------------------------------------------------------------------- |
| `kind` | new `varchar(16) NOT NULL DEFAULT 'paid'` — `paid` or `pre_claim_free` |

A free pre-claim subscription is a real row here, which is what makes the existing chat
gate work with zero new gating code. `kind` keeps unpaid rows from silently polluting
finance reporting.

## 5. Server Architecture

### 5.1 New boundary: `src/lib/server/catalog-source/`

Same seam style as `server/content/` and `server/media/` — a service boundary that
routes call, designed so the in-process implementation can become a remote client later.

```
src/lib/server/catalog-source/
  CatalogSourceService.ts   # boundary: lookupArtist(), importArtist()
  adapters/AudiusAdapter.ts # HTTP to normalised DTO
  types.ts                  # ExternalArtist / ExternalTrack — our shapes, not Audius's
  index.ts
```

`lookupArtist(query)` searches the source and returns **every** candidate, so an admin
can confirm the right person before importing. It is **not** user-facing search — that
stays out of scope (section 1).

`importArtist(externalId)` takes an **id** and resolves it through the source's own id
endpoint (`GET /v1/users/{id}`) — **never through search**. Audius search matches names
and handles, not ids: `?query=LKdlD` does not return `LKdlD`. Resolving an id by search
and taking the first hit would import a completely unrelated account under the operator's
intent — the impostor failure this two-step design exists to prevent.

There is no separate `refreshArtist()`: `importArtist` is idempotent, so re-running it is
the refresh.

Rules for the seam: **no Audius response types and no Drizzle rows cross it.** The
adapter returns `ExternalArtist` / `ExternalTrack`; `CatalogSourceService` maps those
onto `artists` / `tracks` rows and returns primitives.

`importArtist(source, handle)` is **idempotent**: it upserts on `(origin, external_id)`
for the artist and for each track. Re-running it refreshes metadata and adds new tracks;
it never duplicates, and it never touches PDM-side data (chat, comments, likes,
subscriptions).

### 5.2 Import is push, not pull

An admin-triggered import — no catalog crawler. We seed named artists we actually intend
to contact, which keeps volume, moderation load and legal exposure proportional to
intent. Slice 1 exposes it as a script / admin endpoint only.

`lookupArtist(handle)` returns candidates for a human to confirm; `importArtist` takes an
**id**, never a search string, so no search result is ever imported implicitly. Given the
impostor case in section 3.1, the service refuses to import an artist unless:

| Gate      | Rule                                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity  | `is_verified === true` — Audius's own verification is the strongest available signal that the account is the person                                 |
| Liveness  | `is_deactivated === false`                                                                                                                          |
| Substance | `track_count > 0`                                                                                                                                   |
| Per track | All of `is_streamable`, `is_available`, `access.stream` true **and** all of `is_stream_gated`, `is_unlisted`, `is_delete` false — otherwise skipped |
| Display   | Honour `field_visibility` — the artist controls what is public, so a hidden `play_count` stays hidden on our page too                               |

The `is_verified` gate is a policy default, not a hard technical limit: an admin importing
an unverified artist on purpose is a deliberate override, logged as such.

The per-track gate is wider than "is it streamable" because the track object — dumped in
full on 2026-08-29 — carries six independent ways to be unplayable. `is_stream_gated` is
the dangerous one: a token-gated track needs a wallet signature we do not have, so it
would import cleanly and only fail at play time. `is_unlisted` and `is_delete` matter for
a different reason: the artist deliberately took that track out of public view, and
re-publishing it on our page is exactly the disrespect this feature cannot afford.

Audius also exposes a per-track `license` (e.g. `All rights reserved`) and an `isrc`. We
store both: the licence travels with music that is not ours, and the ISRC is the join key
if MusicBrainz is ever added as a second source.

### Imported rows are hidden until section 6 ships

**Import writes `artists.is_active = false` and `tracks.is_published = false`.** This is a
correctness requirement, not tidiness. The app finds content by flags, not by imports:
`getPopularTracks` (`queries.ts:443`) selects every published, playable track globally,
`getActiveArtists` (`queries.ts:279`) returns every active artist, and `/artist/[slug]`
loads purely by slug. Publishing on import would put a real person's name, photo and
banner on a page that reads as their official PDM presence — with none of the "unofficial"
chrome from section 6 and no working audio. Slice S2b flips both flags on **together
with** the notice, so the disclaimer and the visibility can never be out of step.

**Correction (2026-08-30, from code review): the flags alone do NOT achieve this.**
`is_active` was never a visibility mechanism in this codebase. `/artist/[slug]` loads by
slug and never reads it — as this very section notes two paragraphs up and then relies on
it anyway — so the first import would have served a real person's page. Native artists
awaiting onboarding approval are also created with `is_active = false`
(`artist/register/+page.server.ts:90`) and their pages are reachable, so tightening
`is_active` would have been both insufficient here and a regression there.

The route therefore gates on **`origin`**: `/artist/[slug]` 404s anything that is not
`origin = 'native'`. That is the single line S2b replaces with the real seeded page, and
it is the load-bearing guarantee — the flags are now defence in depth, keeping imports out
of `getPopularTracks` and `getActiveArtists`, not the primary gate.

The lesson generalises: **"we write a flag that means hidden" is not a visibility
guarantee until some reader enforces it.** Any future scope that adds a way to reach an
artist (search, an API, a sitemap) must add its own `origin` gate, because nothing about
the data shape enforces one.

### Import must never modify a claimed page

Once an artist claims their page they edit their own name, bio and avatar; a later
re-import would overwrite all of it. The upsert therefore carries
`setWhere: claimed_at IS NULL`, and the service reports `already_claimed` when the guard
suppressed the write. This is the second reason `claimedAt` is stored in this scope even
though badges are not built.

### Slug

`artists.slug` is globally unique and the slug is derived from the source handle, so an
import whose handle collides with an existing PDM artist is refused with `slug_taken`
rather than raising an unhandled `unique_violation`. Re-importing the _same_ source
artist is not a collision.

### 5.3 Changes to existing code

**`messages/access.ts`** — delete lines 85-86 (`const ownerUserId = artist?.userId;`
and `if (!ownerUserId) return DENIED;`) and widen `AccessResult` from
`ownerUserId: string` to `ownerUserId: string | null`.

Every consumer is already null-safe; **none needs fixing**:

| Consumer                                                     | With `ownerUserId === null` | Correct?                                                               |
| ------------------------------------------------------------ | --------------------------- | ---------------------------------------------------------------------- |
| `isArtist` (`CommentService.ts:65,124`, `ChatService.ts:49`) | `false`                     | Yes — there is no owner                                                |
| `canDelete` (`ChatService.ts:50`, `CommentService.ts:70`)    | `false`                     | Yes — no artist-moderator exists yet                                   |
| link policy (`CommentService.ts:100`)                        | links blocked for everyone  | Yes — and useful: link spam on an ownerless page is refused by default |
| moderation delete (`CommentService.ts:203`)                  | nobody can artist-moderate  | Yes — moderation comes from the admin layer in section 8               |

The owner-bypass line above the guard (`if (viewerUserId && viewerUserId === ownerUserId)`)
is already protected by `viewerUserId &&`, so a null owner cannot let an anonymous
viewer through.

Losing the guard loses only an artist-existence check, which the `notNull` FKs enforce
anyway.

**`api/music/[id]/+server.ts`** — branch on `track.audioSource` before line 33:
`audius` returns `{ src: track.audioUrl }` directly; `r2` keeps the existing
`getFileUrlFromR2` presign. The `visibility === 'subscribers'` gate above is untouched
(seeded tracks are always `public`, so it is a no-op for them).

**`ChatService`** — origin-aware **read**, unchanged **write**:

|                               | Native artist                                 | Seeded page                          |
| ----------------------------- | --------------------------------------------- | ------------------------------------ |
| Read history (`:72`)          | subscriber or owner (unchanged)               | **open to all**                      |
| Live frames (`maskChatEvent`) | masked teaser for non-subscribers (unchanged) | **unmasked for all**                 |
| Write (`:97`)                 | subscriber or owner (unchanged)               | **subscriber only** (free subscribe) |

Implementation: resolve `isSeeded` (`artist.origin !== 'native'`) alongside the existing
`isSubscriber` / `ownerUserId` lookup, then use `!isSubscriber && !isOwner && !isSeeded`
at `:72`, and `maskChatEvent(event, isSubscriber || isArtist || isSeeded)` in
`chat.remote.ts`. Line `:97` is **not** changed — write stays subscriber-gated, which is
what keeps Subscribe as the conversion event.

**Chat rate limiting** — new `src/lib/server/chat/rateLimits.ts` mirroring
`comments/rateLimits.ts`. Two limiters, both of which must pass:

- `chatRoomWriteLimiter` — hard, keyed per user per room, 10 per 60s.
- `chatGlobalWriteLimiter` — soft backstop, keyed per user, 30 per 60s. Without it a
  spammer gets the full per-room allowance in each of hundreds of seeded rooms.

`createRateLimiter` itself needs no change — only the key at the call site. Note that
the per-room key multiplies live windows (user times room); the map is bounded by the
existing prune threshold, but this makes the documented Redis upgrade more urgent, not
less.

## 6. The Page

Reuse the existing `/artist/[slug]` route — **no second route**. When
`artist.origin !== 'native'`:

- **Banner** from Audius `cover_photo`, falling back to a PDM placeholder; avatar from
  `profile_picture`.
- **"Unofficial page" notice above the fold** — not in the footer. The wording must read
  as _fans are asking for this artist_, never as the artist's own presence: that is the
  line between nominative fair use and passing-off
  (`.claude/wiki/ideas/artist-page-seeding-and-claim.md`).
- **Claim CTA** — in this scope a request form only; no verification, no handover.
- **Attribution** — "Music from Audius" with a link to `externalUrl`.
- **Chat notice** — "messages here are visible to everyone", since a seeded room is
  publicly readable and a fan would otherwise assume privacy.
- No Studio widgets; no subscribers-only content (seeded artists have none).

`+page.server.ts:14` (`const isOwner = userId === artist.userId`) is already safe when
both sides are nullish, but gets an explicit guard for clarity.

## 7. Frontend

Per CLAUDE.md, **invoke the `design-taste-frontend` skill before the UI slice** — this
touches `src/routes/(app)/artist/[slug]/` and `src/lib/ui/`. Svelte 5 runes only.

## 8. Moderation — mandatory, because there is no entry barrier

Free subscription plus no email verification means the Sybil barrier the wiki relied on
is absent (locked decision 3). Moderation is therefore load-bearing, not a nice-to-have:

- Both chat rate limiters from section 5.3.
- **Report** action on a chat message and on a comment.
- **Admin kill-switch**: freeze the chat of a single seeded page.
- **One-click page removal for the artist** — cheaper than a lawsuit, and good faith.
- `users.trust_score` already exists as the hook for TrustScore weighting later; not
  used in this scope.

## 9. PR Slicing (strict TDD per slice: red, green, refactor)

| Slice   | Content                                                                                                                   | Ships                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **S1**  | Schema + migration, `CatalogSourceService`, `AudiusAdapter`, idempotent import                                            | No UI                                     |
| **S2a** | Remove the `access.ts` guard and widen the type; `api/music` audio-source branch; chat read by origin; chat rate limiters | Social layer works on an ownerless artist |
| **S2b** | The page: banner, unofficial notice, Claim form, attribution, chat notice                                                 | Visible seeded page                       |
| **S2c** | Moderation: report, admin kill-switch, artist page removal                                                                | Safe to seed at volume                    |

Each slice is its own PR, reviewed at the boundary.

## 10. Testing

- `AudiusAdapter` — against **recorded fixtures**, no network in tests. Fixtures are
  captured from the live responses in section 3.1, including the two-`deadmau5` search
  result, so the impostor case is a permanent test case rather than a memory.
- Import gates — an unverified, a deactivated, and a zero-track candidate are each
  refused; a non-`is_streamable` track is skipped while its siblings import; a hidden
  `field_visibility.play_count` does not reach the DTO.
- `audioUrl` — the stored value is the stable `/tracks/{id}/stream` endpoint. A test
  asserts we never persist a URL containing a `signature` query parameter, which is the
  regression that would look fine on the day and 403 the next.
- `CatalogSourceService.importArtist` — idempotency: a second import creates no
  duplicate artist and no duplicate tracks; it refreshes metadata; it leaves PDM-side
  rows (chat, comments, likes, subscriptions) untouched.
- `access.ts` — **regression**: the four existing assertions expecting
  `ownerUserId: 'owner1'` must stay green. New case: a track belonging to an artist with
  `userId = null` is commentable and likeable, while an unpublished target or one with
  `subscribers` visibility is still denied.
- `CommentService` / `ChatService` with `ownerUserId = null`: `isArtist` false,
  `canDelete` false for a non-author, links rejected, artist-moderation denied.
- `api/music/[id]` — an `audius` track returns its stream URL and never calls R2; an
  `r2` track still presigns.
- Chat gating — seeded room: read allowed anonymously, write rejected with
  `not_subscribed` until subscribed. Native artist: both still gated.
- Rate limiters — exhausting one room does not block a different room; the global
  backstop trips across rooms.
- e2e — a seeded page renders the unofficial notice and Claim CTA, plays an Audius
  track, and accepts a comment and a chat message after Subscribe.

## 11. Related

`.claude/wiki/ideas/artist-page-seeding-and-claim.md` ·
`.claude/wiki/ideas/fan-provenance.md` ·
`.claude/wiki/concepts/artist-subscription.md` ·
`.claude/wiki/architecture/comments-and-chat-scale-strategy.md` ·
`.claude/wiki/architecture/service-boundaries.md` ·
`docs/superpowers/specs/2026-08-18-realtime-fan-chat-design.md`
