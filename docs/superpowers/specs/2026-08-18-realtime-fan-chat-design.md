# Realtime Fan Chat — Design

**Date:** 2026-08-18
**Branch:** TBD (off `main`)
**Status:** Design approved pending user review

## 1. Goal & Scope

Ship the subscriber-only, per-artist **fan chat** perk (`messages.chat`) that
`.claude/wiki/architecture/comments-and-chat-scale-strategy.md` already scoped as
"Slice 2" and `src/lib/db/schemas/messages.ts` already left a placeholder comment for.
Unlike comments, chat is **subscriber-gated on both read and write** — which makes it
invisible from outside and risks the same cold-start "dead room" trap comments were
deliberately made free to avoid (`.claude/wiki/concepts/artist-subscription.md`). This
spec's core product idea is solving that: a **live, real-signal teaser** for
non-subscribers (online count, "artist in room", real message _cadence_ with masked
_content_) so the perk is legible from outside without leaking gated content.

Realtime transport is **SvelteKit `query.live`** (remote functions, confirmed present
in the installed `@sveltejs/kit@2.69.3`) backed by **Postgres `LISTEN`/`NOTIFY`** for
message delivery and an **in-process `EventEmitter`** for presence. No pgBouncer, no
Redis, no second datastore — all deferred per existing YAGNI reasoning in
`.claude/wiki/architecture/database-hosting.md` and `comments-and-chat-scale-strategy.md`.
Single Node instance is assumed throughout; multi-instance fan-out is an explicitly
named future trigger, not built here.

### Locked decisions (from brainstorming)

1. **Transport: Postgres `LISTEN`/`NOTIFY`**, not polling. A dedicated single-connection
   `postgres()` client is used only for `LISTEN`, separate from the app's query pool —
   **no pgBouncer needed locally.** The existing `max: 1` cap in `src/lib/db/index.ts`
   exists solely to protect a _future managed_ Postgres's connection ceiling (per
   `database-hosting.md`); the local docker-compose Postgres has no such constraint.
   The pool/pooler swap for the eventual Supabase move stays exactly as already
   documented (transaction-mode `:6543` + `prepare: false` for the query pool, direct
   `:5432` for migrations, separate session-mode connection for the listener) — a
   connection-string change at move time, not something to pre-build now.
2. **One live query per room, masked server-side (not two functions, not client-side
   blur).** A single `getChatRoom(artistId)` `query.live` function serves both
   subscribers and non-subscribers. The server resolves the caller's subscriber status
   once per connection via the existing `EntitlementService.isSubscriberOf`, listens on
   one `chat_room_{artistId}` channel regardless of caller, and **masks the payload
   before it leaves the server** — never sends real message bodies to an unentitled
   client, even blurred by CSS. This mirrors the access discipline already enforced by
   `resolveTargetAccess`/`messages/access.ts`.
3. **Non-subscriber teaser widget**, not a hidden section. Shows a live header (online
   count, "artist in room") and a blurred body that receives real-time _events_ (so the
   blur visibly reacts when something is posted) with the body/author replaced by a
   placeholder built from the same event — real cadence, fake content.
4. **Presence is platform-wide for subscribers, page-scoped for guests, and stored
   nowhere.** A subscriber's chat-room connections open in a root layout as soon as
   their subscribed-artist list is known and stay open across navigation until they
   leave the platform (tab close) — "online" means "on the platform," not "looking at
   this chat right now." A non-subscriber's connection is scoped to the artist page
   they're viewing and closes on navigation away. Presence lives in an in-memory
   `Map<artistId, Set<connectionEntry>>` per Node process, mutated on live-query
   connect/disconnect (`finally` block), broadcast to peers via a local `EventEmitter` —
   no DB, no Redis. Multi-instance presence (Redis) is a named future trigger, not
   built here.
5. **Data model, moderation, and link policy are reused, not reinvented.** New table
   `messages.chat` (`id, artistId, authorId, body, createdAt, deletedAt`, index on
   `(artist_id, created_at desc)`) — flat, no `targetType`/`parentId` (unlike
   `messages.comments`). Delete permissions (author-own, artist-owner-any), the
   `containsUrl` link rule, and `MAX_MESSAGE_LENGTH` all come from the existing
   `src/lib/server/messages/policy.ts` and the `CommentService` pattern. No rate
   limiting in v0 (same YAGNI reasoning as pgBouncer — not a problem at current scale).
6. **History via a normal (non-live) keyset query**, not through the live channel. On
   connect, the client loads the last ~50 messages via `(artist_id, created_at desc)`
   keyset pagination (never `OFFSET`, consistent with the comments ladder); `query.live`
   only carries messages that arrive _after_ connection.
7. **Design step is explicit and precedes UI implementation.** A `/ui-ux-pro-max` pass
   produces the visual direction for both the subscriber chat view and the
   non-subscriber blurred-teaser view before any component is built.

### Out of scope (explicitly)

- Rate limiting / spam control beyond the existing link rule.
- Multi-instance presence or message fan-out (Redis pub/sub) — named trigger, not built.
- Background/cross-page notifications for messages arriving while not on that artist's
  page (the platform-wide connection model enables this cheaply later; not this branch).
- pgBouncer/Supavisor setup of any kind, locally or otherwise.
- Chat history archival to a purpose-built store (Cassandra/Scylla tier from
  `comments-and-chat-scale-strategy.md`) — Postgres only, this branch.
- Threading, reactions/likes on chat messages (comments already have likes; chat does
  not get them here).
- The proposed "Community/Fans" tab and expanded-player rebuild (#19) — the chat widget
  ships as its own surface on the artist page, not gated on either.

## 2. Current State (grounding)

- `src/lib/db/schemas/messages.ts` already defines `messages.comments` and leaves an
  explicit placeholder comment for `messages.chat` as "Slice 2," with the target shape
  already spelled out.
- `src/lib/server/entitlement/EntitlementService.ts` — `isSubscriberOf(userId, artistId)`
  and `getSubscribedArtistIds(userId)` already exist and are reused as-is.
- `src/lib/server/messages/policy.ts` — `containsUrl`, `resolveTargetOwnerUserId`,
  `MAX_MESSAGE_LENGTH` already handle an `'artist'` target type in `MessageTargetType`,
  though `resolveTargetOwnerUserId`'s `'artist'` branch and `messages/access.ts`'s
  `resolveTargetAccess` need extending/bypassing for the chat's own gate (chat's access
  rule is simply `isSubscriberOf`, not the content-visibility rule content uses).
- `src/lib/server/comments/CommentService.ts` is the direct structural precedent for
  `ChatService` (DTO-only boundary, `list`/`create`/`delete`, `displayName` helper).
- `src/lib/ui/components/MessageList.svelte` / `MessageComposer.svelte` are the reusable
  UI precedent for the subscriber-facing message list/composer.
- `svelte.config.js` does **not** currently enable `kit.experimental.remoteFunctions` or
  `compilerOptions.experimental.async` — required prerequisite, confirmed against the
  installed `@sveltejs/kit@2.69.3` types (`query.live` is present, not a v3-only API).
- `src/lib/db/index.ts:12` sets `max: 1` on the shared `postgres-js` client — the listener
  connection must be a **separate** `postgres()` instance, not drawn from this pool.
- `.claude/wiki/product/artist-page.md` names "fan community (chat)" as part of the
  artist page's intended surface set — this is where the widget lives.

## 3. Data Model

New table, in the existing `messages` Postgres schema (`src/lib/db/schemas/messages.ts`):

```ts
export const chat = messagesDbSchema.table(
	'chat',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		artistId: uuid('artist_id')
			.notNull()
			.references(() => artists.id, { onDelete: 'cascade' }),
		authorId: uuid('author_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		body: text('body').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		deletedAt: timestamp('deleted_at')
	},
	(t) => [index('chat_artist_idx').on(t.artistId, t.createdAt)]
);
```

Add to `schema.ts` aggregator + relations + `$inferSelect`/`$inferInsert` exports in
`src/lib/db/index.ts`, per the standard schema-change checklist in `CLAUDE.md`.

## 4. Server Architecture

### 4.1 `ChatRepository` (`src/lib/db/services/ChatRepository.ts`)

Thin repository, same shape as `CommentRepository`: `listForArtist` (keyset, last N),
`create`, `getById`, `softDelete`.

### 4.2 `ChatService` (`src/lib/server/chat/ChatService.ts`)

Application boundary, DTO-only (no Drizzle rows cross it), following `CommentService`:

- `listForArtist({ artistId, viewerUserId, before? })` — gated by
  `EntitlementService.isSubscriberOf`; returns `{ ok: false, reason: 'not_subscribed' }`
  rather than a DTO list when the viewer isn't entitled (this endpoint is only ever
  called for the subscriber path — the guest path never fetches history, only the live
  teaser).
- `create({ artistId, authorId, body, ... })` — same entitlement gate, then the existing
  `containsUrl`/`MAX_MESSAGE_LENGTH` policy from `messages/policy.ts`, then
  `ChatRepository.create`. On success, publishes the Postgres `NOTIFY` (see 4.4).
- `delete({ messageId, userId })` — author-or-owner, same as `CommentService.delete`.

### 4.3 Masking (`src/lib/server/chat/mask.ts`)

Pure function, unit-tested in isolation, no DB/network:

```ts
function maskChatEvent(event: ChatMessageEvent, viewerIsSubscriber: boolean): ChatFrame;
```

Subscriber → passthrough real `ChatDTO`. Non-subscriber → same event shape, `body` and
`author` replaced with a placeholder (exact copy/avatar treatment is a UI-design
decision from step 4.5's `/ui-ux-pro-max` pass, not fixed here). This is the seam that
guarantees gated content never serializes to an unentitled client — enforced at the
boundary, not by the client choosing not to render it.

### 4.4 Presence (`src/lib/server/chat/presence.ts`)

In-memory only, one module-level state for the Node process:

```ts
type PresenceEntry = { connectionId: string; userId: string | null; isArtist: boolean };
const rooms = new Map<string /* artistId */, Set<PresenceEntry>>();
const emitter = new EventEmitter(); // 'presence:{artistId}' -> snapshot
function join(artistId, entry): void; // adds, emits snapshot
function leave(artistId, entry): void; // removes, emits snapshot
function snapshot(artistId): { onlineCount: number; artistOnline: boolean };
```

`isArtist` is resolved once at connect time by comparing `viewerUserId` to the artist's
`userId` (`ArtistService.getArtistById`). No persistence anywhere — a process restart
resets presence to empty, which is correct (it's "right now," not history).

### 4.5 `getChatRoom` live query (`src/routes/.../chat.remote.ts` or similar)

```ts
export const getChatRoom = query.live(v.string(), async function* (artistId) {
	const { locals } = getRequestEvent();
	const viewerUserId = locals.user?.id ?? null;
	const isSubscriber = await EntitlementService.isSubscriberOf(viewerUserId, artistId);
	const connectionId = crypto.randomUUID();
	const isArtist = await resolveIsArtistOwner(viewerUserId, artistId);

	presence.join(artistId, { connectionId, userId: viewerUserId, isArtist });
	try {
		for await (const event of mergeAsync(pgListenChannel(artistId), presenceEvents(artistId))) {
			yield buildFrame(event, isSubscriber, presence.snapshot(artistId));
		}
	} finally {
		presence.leave(artistId, { connectionId, userId: viewerUserId, isArtist });
	}
});
```

`pgListenChannel(artistId)` wraps the dedicated single-connection listener client's
`sql.listen('chat_room_' + artistId, ...)`, converted to an async iterable. `mergeAsync`
is a small internal utility (push-based async queue fed by two callback sources) — no
external dependency needed for this. `ChatService.create` calls
`sql.notify('chat_room_' + artistId, payload)` after a successful insert.

## 5. Client Architecture

- **Subscriber connection lifecycle** — root layout (`(app)/+layout.svelte` or a rune
  store it initializes) calls `EntitlementService`-derived subscribed-artist list once,
  opens `getChatRoom(artistId)` per artist, keeps them alive across client-side
  navigation, and tears down on tab close (framework-managed via the live query's own
  connection lifecycle).
- **Guest connection lifecycle** — the artist-page teaser widget itself calls
  `getChatRoom(artistId)` only while mounted; navigating away unmounts it and the
  connection closes normally.
- **`ChatWidget.svelte`** (new, `src/lib/ui/components/`) — renders either the real
  `MessageList`/`MessageComposer` pair (subscriber) or the blurred teaser (guest),
  branching on the same `getChatRoom` result's frames (the server already decided which
  shape to send).
- **UI/UX design pass** — before building `ChatWidget`, run `/ui-ux-pro-max` to produce
  the visual direction for both states (subscriber view, blurred-teaser view: what the
  blur treatment looks like, how the online/artist-in-room header reads, placeholder
  message styling). This is its own slice (§6, Slice 5) and its output feeds Slice 6.

## 6. PR Slicing (strict TDD per slice, red → green → refactor)

0. **Prereq (small, folds into Slice 1):** enable `kit.experimental.remoteFunctions` and
   `compilerOptions.experimental.async` in `svelte.config.js`.
1. **Schema + Repository** — `messages.chat` table, migration, `ChatRepository`.
2. **`ChatService` boundary + masking** — entitlement-gated list/create/delete, reusing
   `messages/policy.ts`; `maskChatEvent` as an isolated pure-function unit.
3. **Presence registry** — `presence.ts` in isolation (no Postgres, no network),
   join/leave/snapshot/emit fully unit-tested.
4. **`getChatRoom` live query** — dedicated listener connection, `mergeAsync` utility,
   NOTIFY on `ChatService.create`, wired end-to-end.
5. **UI/UX design pass (`/ui-ux-pro-max`)** — subscriber + guest-teaser visual direction.
6. **`ChatWidget` + wiring** — component built from Slice 5's direction, root-layout
   platform-wide subscription for subscribers, page-scoped mount for guests, artist-page
   integration.

## 7. Testing

- Unit: `ChatService` (entitlement gate, policy reuse), `maskChatEvent`, `presence.ts` —
  all pure/isolated, no live Postgres connection required.
- Integration: `getChatRoom` end-to-end against the real dev Postgres (LISTEN/NOTIFY
  round-trip), covering both a subscriber and non-subscriber connecting to the same room
  and receiving correctly-shaped frames from the same event.
- Component: `ChatWidget` in both render branches (Vitest browser/`client` project, per
  `*.svelte.{test,spec}.ts` convention already in use for `MessageList`/`MessageComposer`).
- e2e: one Playwright flow — subscriber posts, a second subscribed session sees it live;
  a guest session on the same artist page sees the teaser blur react without seeing body.

## 8. Related

`.claude/wiki/architecture/comments-and-chat-scale-strategy.md` ·
`.claude/wiki/concepts/artist-subscription.md` ·
`.claude/wiki/architecture/database-hosting.md` ·
`.claude/wiki/product/artist-page.md` · `.claude/wiki/strategy/roadmap-phases.md`
