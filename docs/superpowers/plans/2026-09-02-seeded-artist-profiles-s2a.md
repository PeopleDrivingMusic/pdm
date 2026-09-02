# S2a — the social layer works on an ownerless artist

Issue #43, slice 2a. Spec: `docs/superpowers/specs/2026-08-29-seeded-artist-profiles-design.md`
§5.3. Follows S1 (`2026-08-29-seeded-artist-profiles-s1.md`).

**Ships:** comments, likes, playback and chat all function on an artist with no `user_id`.
**Does not ship:** any UI. `/artist/[slug]` still 404s every non-native artist; the page is
S2b. Everything here is dormant until that gate is replaced.

Per `CLAUDE.md` → "Implementation plans": no test bodies, no implementation bodies. The
tests below are already on disk and already failing.

## 1. Decisions

### 1.1 The owner is optional, not missing

`resolveTargetAccess` denies any target whose artist has no `userId` (`access.ts:85-86`).
That is an artist-existence check wearing an owner check's clothes — the `notNull` FK from
`tracks.artist_id` already guarantees the artist exists. Left in, it makes every seeded
track unplayable and uncommentable forever.

`AccessResult.ownerUserId` widens to `string | null`. Every consumer was already null-safe
and **none changes** — verified by reading each, not assumed:

| Consumer                                                     | With a null owner          | Right?                                                                 |
| ------------------------------------------------------------ | -------------------------- | ---------------------------------------------------------------------- |
| `isArtist` (`CommentService.ts:65,124`, `ChatService.ts:49`) | `false`                    | Yes, there is no artist                                                |
| `canDelete` (`ChatService.ts:50`, `CommentService.ts:70`)    | author-only                | Yes, no artist-moderator exists                                        |
| link policy (`CommentService.ts:100`)                        | links blocked for everyone | Yes, and useful — link spam on an ownerless page is refused by default |
| moderation delete (`CommentService.ts:203`)                  | nobody can artist-moderate | Yes, moderation is S2c                                                 |

The owner bypass (`access.ts:89`) is `viewerUserId && viewerUserId === ownerUserId`. With
both sides null, `null === null` is true and only the `viewerUserId &&` guard stops an
anonymous stranger inheriting the artist's own access to unpublished drafts. That guard is
now load-bearing rather than defensive, so it gets its own test.

### 1.2 Playback branches on `audio_source`, not on `origin`

A seeded track's `audio_url` holds the source's stream endpoint, not an R2 object key;
presigning it yields a signature for an object that does not exist. `tracks.audio_source`
(`schemas/catalog.ts:61`, default `'r2'`, notNull) already records which it is, so the
branch reads the column that means it rather than inferring from the artist.

The branch goes **below** the `visibility === 'subscribers'` gate, which is untouched. It
is a no-op for seeded tracks (always `public`) but the ordering is pinned by a test, so a
later gated import cannot hand out a source URL for free.

### 1.3 Chat opens for reading, stays closed for writing

|              | Native artist              | Seeded page                     |
| ------------ | -------------------------- | ------------------------------- |
| Read history | subscriber or owner        | **open to all**                 |
| Live frames  | teaser for non-subscribers | **unmasked for all**            |
| Write        | subscriber or owner        | **subscriber only** (unchanged) |

Read must open or the room is unreachable by everyone forever: nobody owns the page and
`isSubscriberOf` is false for all. Write stays subscriber-gated because that is the
conversion event the whole product rests on.

`isSeeded` is `origin !== 'native'`, and it stays true after a claim. Origin is a fact
about where the catalog came from, not about the account, and a claimer keeps the open
room they already had.

**`ChatService.create` deliberately does not learn `isSeeded`.** It keeps calling
`resolveTargetOwnerUserId`, so "the write path is not origin-aware" is enforced by what is
in scope rather than by a comment somebody can delete.

### 1.4 One read predicate, not two booleans

History (`ChatService.getMessages`) and the live stream (`chat.remote.ts`) decide the same
question in two places. They already differ in shape — one returns `not_subscribed`, the
other masks — and adding a third term to both invites drift where a room is readable in
one and masked in the other.

New `src/lib/server/chat/visibility.ts` holds the single predicate; both call it.

### 1.5 Two limiters, both must pass

- `chatRoomWriteLimiter` — 10 per 60s, keyed `userId:artistId`.
- `chatGlobalWriteLimiter` — 30 per 60s, keyed `userId`.

The per-room limiter alone stops being a limit the moment seeding multiplies rooms: one
account gets the full allowance in each of hundreds of pages. The global limiter is the
only thing that sees the total.

`createRateLimiter` needs no change — only the key at the call site. The per-room key
multiplies live windows (users × rooms) against a `pruneThreshold` of 1024
(`rateLimiter.ts:7`), which makes the documented Redis upgrade more urgent, not less.
Recorded here, not fixed here.

## 2. File map

| File                                   | Change                                                         |
| -------------------------------------- | -------------------------------------------------------------- |
| `src/lib/server/messages/access.ts`    | delete `:85-86`; widen `AccessResult`                          |
| `src/lib/server/messages/policy.ts`    | add `resolveArtistRoomContext`                                 |
| `src/lib/server/chat/visibility.ts`    | **new** — `canReadChatContent`                                 |
| `src/lib/server/chat/rateLimits.ts`    | **new** — two limiters + `chatWriteKey`                        |
| `src/lib/server/chat/ChatService.ts`   | `getMessages` uses the context + predicate; `create` untouched |
| `src/lib/remote/chat.remote.ts`        | same context + predicate feeds `maskChatEvent`                 |
| `src/routes/api/music/[id]/+server.ts` | branch on `audioSource`                                        |
| `src/routes/api/chat/+server.ts`       | apply both limiters to POST                                    |

## 3. Signatures

```ts
// messages/access.ts
type AccessResult = { ok: true; ownerUserId: string | null } | { ok: false };

// messages/policy.ts
export interface ArtistRoomContext {
	ownerUserId: string | null;
	isSeeded: boolean;
}
export function resolveArtistRoomContext(artistId: string): Promise<ArtistRoomContext>;

// chat/visibility.ts
export function canReadChatContent(input: {
	isSubscriber: boolean;
	isOwner: boolean;
	isSeeded: boolean;
}): boolean;

// chat/rateLimits.ts
export const chatRoomWriteLimiter: ReturnType<typeof createRateLimiter>;
export const chatGlobalWriteLimiter: ReturnType<typeof createRateLimiter>;
export function chatWriteKey(userId: string, artistId: string): string;
```

## 4. Tests (already on disk, currently red)

| Behaviour                                                                             | Test                                           |
| ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| ownerless target resolves, drafts stay hidden, anonymous never matches a null owner   | `src/lib/server/messages/access.spec.ts:137`   |
| owner + origin in one artist read; claimed stays seeded; missing artist fails closed  | `src/lib/server/messages/policy.spec.ts:95`    |
| seeded room reads open, writes still refused, nobody flagged as artist                | `src/lib/server/chat/ChatService.spec.ts:324`  |
| the read predicate itself                                                             | `src/lib/server/chat/visibility.spec.ts:7`     |
| per-room and global limiter keying                                                    | `src/lib/server/chat/rateLimits.spec.ts:13,30` |
| source-hosted playback, r2 playback, schema default, gate ordering                    | `src/routes/api/music/[id]/server.spec.ts:72`  |
| 429 in one room, 429 spread across rooms, other users unaffected, no write on refusal | `src/routes/api/chat/server.spec.ts:248`       |

`chat.remote.ts` has no spec and gets none: its logic is now one call to a tested
predicate, and standing up a `query.live` harness would test SvelteKit, not us. That is
the reason 1.4 extracts the predicate at all.

## 5. Traps

- **`null === null`.** Removing the guard makes the owner bypass reachable with a null
  owner. `viewerUserId &&` is the only thing between an anonymous viewer and the artist's
  own access. Test first, then delete the lines.
- **`vi.clearAllMocks()` does not clear implementations.** `getFileUrlFromR2` is mocked
  with `mockResolvedValue` at module scope and survives `beforeEach`; `mockReset` would
  break it.
- **Rate limiters are module-level singletons.** State leaks between tests in a file
  unless `reset()` runs in `beforeEach`.
- **Limiter order.** The room key needs a parsed `artistId`, so metering happens after
  payload validation. A malformed body is a 400, never a 429.
- **`origin` is not `is_active`.** Nothing here relaxes the `/artist/[slug]` 404. If a
  change appears to make a seeded page reachable, it is a bug in this slice, not S2b
  arriving early.

## 6. Verification

```
yarn vitest --run --project server src/lib/server src/routes/api
yarn vitest --run --project server            # 490 green before this slice
yarn run check                                # 0 errors (68 pre-existing warnings)
yarn lint
```

Mutation checks required before the commit, per `CLAUDE.md`:

- drop `viewerUserId &&` from the owner bypass → the anonymous-viewer test must go red
- invert `isSeeded` in `canReadChatContent` → the seeded-room read tests must go red
- drop the global limiter from the POST path → the spread-across-rooms test must go red
