# S2b — the page

Issue #43, slice 2b. Spec: `docs/superpowers/specs/2026-08-29-seeded-artist-profiles-design.md`
§6-7. Follows S2a (`2026-09-02-seeded-artist-profiles-s2a.md`).

**Ships:** `/artist/[slug]` renders a seeded artist instead of 404ing — banner, unofficial
notice, attribution, a claim-request form, working chat and playback (the flags S2a
gated on now flip). Subscribing to an unclaimed page is free and says so.

**Does not ship:** claim verification or handover (spec §1, explicit non-goal). A claim
is one row; nothing reviews it yet. Moderation (report, kill-switch, page removal) is
S2c.

Per `CLAUDE.md` → "Implementation plans": no test bodies, no implementation bodies. The
tests below are already on disk, and this slice is already green — implemented
alongside this plan rather than after it, per the user's steer on this branch. What
follows is the decision record, not a prediction.

## 1. Decisions

### 1.1 The gate that shows the page is also the gate that hides it

`+page.server.ts`'s `load` denied `origin !== 'native'` outright (the S1-era comment
called it deliberate: no notice, no attribution, so a seeded page reading as an
official artist page was worse than 404). That reason is gone once this slice ships
the notice and attribution in the same change, so the `load` gate shrinks to `!artist`.
No new gate is added — `origin` was never a security boundary, only a "is there
anything here worth showing yet" flag, and the answer is now always yes.

### 1.2 Import IS the publish action, once S2b exists

`CatalogImportRepository` wrote every seeded artist `isActive: false` and every seeded
track `isPublished: false`, with a comment naming the two reasons: no page (this
slice) and no working audio endpoint (S2a). Both are done. Flipping the literals to
`true` is not enough by itself — an artist imported _before_ this slice landed already
has a row with the old `false`, and `onConflictDoUpdate`'s `set` only touches the
columns listed in it. Both `set` blocks now list `isActive` / `isPublished` too, so a
second import (S1's own idempotency contract, and the eventual harvester from issue
#45) reconciles an S1-era row instead of leaving it permanently hidden.

The artist `set` sits inside the existing `setWhere: isNull(claimedAt)` guard, so a
claimed artist's `isActive` stays theirs to manage. Tracks carry no equivalent guard on
their `onConflictDoUpdate` — a pre-existing gap (noted, not introduced, not fixed here:
fixing it is a claimed-artist track-editing concern, out of this slice's scope).

### 1.3 A claim request is a row, not a workflow

Spec §6: "in this scope a request form only; no verification, no handover." The spec
names no storage for it. Decided with the user (2026-09-02): a new table, not email —
the project has no email-sending infrastructure at all (checked: no nodemailer,
resend, sendgrid, postmark import anywhere in `src/lib`), and every other admin-facing
queue in this schema (`artist_onboarding_requests`) is already a plain table with no
UI, reviewed out-of-band. `artist_claim_requests` follows that precedent: `artistId`,
`userId`, `message`, `createdAt`, unique on `(artistId, userId)`. No `status` column —
review/approval is real handover work the spec explicitly excludes; adding a column
later is cheap, carrying an unused one is not.

Login is required to submit (decided with the user: claiming ends in taking over the
account and uploading content as that artist, which only makes sense from inside an
existing PDM identity — an anonymous "I am this artist" claim has no account to hand
anything to). The action re-checks `origin !== 'native'` and `claimedAt` itself
(actions and `load` don't share state in SvelteKit), refusing a claim on a page that
is already someone's.

### 1.4 Free-while-unclaimed has to reach the write path, not just the button label

Spec's locked decision 3: pre-claim subscription is free, `subscriptions.kind =
'pre_claim_free'`. There is no billing integration in this codebase at all yet
(`SubscriptionService.subscribe` was, and remains, a bare insert — no Stripe, no
card) — so "free" changes nothing about what happens today. It still has to be
recorded correctly, because the column's own comment says these rows "must never
reach revenue reporting," and that reporting is a future reader of data being written
now, not a future write.

`SubscriptionService.subscribe` gains a `kind` parameter (default `'paid'`, so every
other caller is unaffected). `EntitlementService.subscribe` is the only caller that
needs to decide it, and it decides by re-reading the artist (`origin`, `claimedAt`),
not by trusting a flag the client could set. `kind` is reconciled on every
subscribe/resubscribe, in the `onConflictDoUpdate` `set` too — a fan who subscribed
pre-claim, unsubscribed, and resubscribes after the artist claimed must not resurrect
the free row.

The Subscribe button's own copy branches on `artist.origin !== 'native'`: "Subscribe ·
Free" instead of "Subscribe · $1/mo". Charging a fan $1 that never gets charged is a
smaller bug than a page that promises $1 and quietly waives it, but promising a price
that isn't real is still wrong, and it's one ternary to fix.

### 1.5 The chat widget's own read gate was still the S1-era one

S2a changed the _server's_ read predicate to `isSubscriber || isOwner || isSeeded`,
but `ChatWidget.svelte` had its own client-side `hasAccess = isSubscriber || isArtist`
gating three things at once: whether to fetch history, whether to open the live
connection, and whether to render the message list at all. Left alone, a real visitor
to a seeded page would still see the static locked teaser forever — the backend was
open, the widget never asked it.

`hasAccess` splits into two: `canWrite` (old `hasAccess`, unchanged meaning) and
`canRead = canWrite || isSeeded`, mirroring the server's `canReadChatContent` /
write-path split from S2a exactly (write must not learn `isSeeded`, by the same
reasoning S2a documented — enforced by which boolean the composer's `{#if}` reads, not
by a comment). The live-connection effect's `if (!isArtist) return` widens to `if
(!isArtist && !isSeeded) return`, so an anonymous visitor to a seeded room opens its
own page-scoped connection the same way the artist-owner branch already did.

A `canRead && !canWrite` visitor sees messages and a plain line ("Subscribe above to
join the conversation") instead of the composer — not a second Subscribe button (the
hero already has one; two controls for the same action is the thing the plan for S1
already flagged as worth avoiding). A `seeded-notice` line ("Messages here are visible
to everyone, not just subscribers") renders whenever `isSeeded`, regardless of
`canWrite` — a subscriber posting into an open room needs to know it's not private as
much as a lurker reading it does.

### 1.6 Attribution and the notice sit together, not scattered

Spec §6 lists banner/notice/claim/attribution/chat-notice as five separate bullets;
they render as two blocks. The unofficial-notice line, the claim CTA, and the Audius
attribution link all answer the same visitor question ("why does this page exist and
what can I do about it") and share one banner (`SeededPageNotice.svelte`) directly
under the hero. The chat notice is unrelated to that question (it's about privacy
expectations inside the chat specifically) and lives inside `ChatWidget` instead
(1.5).

## 2. File map

| File                                                                 | Change                                                                           |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/db/schemas/artist.ts`                                       | new `artistClaimRequests` table + unique index                                   |
| `src/lib/db/schema.ts`                                               | aggregator export, relations, type exports for the new table                     |
| `drizzle/migrations/0004_square_arachne.sql`                         | generated, reviewed, applied                                                     |
| `src/lib/db/services/ClaimRequestService.ts`                         | **new** — `create`                                                               |
| `src/lib/db/services/CatalogImportRepository.ts`                     | `isActive`/`isPublished` flip to `true`, in both insert and `set`                |
| `src/lib/db/services/SubscriptionService.ts`                         | `subscribe` gains `kind`, reconciled in `set`                                    |
| `src/lib/server/entitlement/EntitlementService.ts`                   | `subscribe` derives `kind` from the artist                                       |
| `src/routes/(app)/artist/[slug]/+page.server.ts`                     | drop the `origin` gate; add `claimArtist` action                                 |
| `src/routes/(app)/artist/[slug]/+page.svelte`                        | `isSeeded`; banner; Subscribe copy; pass `isSeeded` to `ChatWidget`              |
| `src/routes/(app)/artist/[slug]/components/SeededPageNotice.svelte`  | **new** — notice + attribution + claim CTA                                       |
| `src/routes/(app)/artist/[slug]/components/ClaimRequestModal.svelte` | **new** — the request form                                                       |
| `src/lib/ui/components/ChatWidget.svelte`                            | `isSeeded` prop; `canRead`/`canWrite` split; template + live-connection widening |

## 3. Signatures

```ts
// db/services/ClaimRequestService.ts
export type CreateClaimRequestResult = { ok: true } | { ok: false; reason: 'already_requested' };
export class ClaimRequestService {
	static create(input: { artistId: string; userId: string; message: string | null }):
		Promise<CreateClaimRequestResult>;
}

// db/services/SubscriptionService.ts
static subscribe(userId: string, artistId: string, kind?: 'paid' | 'pre_claim_free'): Promise<void>;

// routes/(app)/artist/[slug]/+page.server.ts
export const actions: Actions; // adds `claimArtist`, alongside the existing `votePoll`

// lib/ui/components/ChatWidget.svelte — props
{ artistId: string; isSubscriber: boolean; isArtist: boolean; isSeeded?: boolean }
```

## 4. Tests (already on disk, green)

| Behaviour                                                                  | Test                                                         |
| -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| import writes active/published; re-import reconciles an S1-era hidden row  | `src/lib/db/services/CatalogImportRepository.spec.ts:67,147` |
| claim request create, dedupe on `(artist, user)`                           | `src/lib/db/services/ClaimRequestService.spec.ts:25`         |
| `subscribe` writes and reconciles `kind`                                   | `src/lib/db/services/SubscriptionService.spec.ts:21`         |
| `kind` derived from origin/claimedAt, defaults to paid on a missing artist | `src/lib/server/entitlement/EntitlementService.spec.ts:53`   |
| page renders (not 404s) a seeded and a claimed-seeded artist               | `src/routes/(app)/artist/[slug]/page.server.spec.ts:46,53`   |
| `claimArtist` action: auth, native/claimed refusal, success, duplicate     | `src/routes/(app)/artist/[slug]/page.server.spec.ts:65`      |
| seeded room: anonymous read opens, composer withheld, notice shown         | `src/lib/ui/components/ChatWidget.svelte.spec.ts:53`         |

`SeededPageNotice.svelte` and `ClaimRequestModal.svelte` have no component spec, matching
this route's existing convention — none of `ArtistTracks`/`ArtistFeed`/`ArtistPosts`/etc.
have one either. Their logic (the form action, the kind derivation) is tested where it
actually lives; the spec's own e2e line (§10) is the intended coverage for the rendered
page.

## 5. Traps

- **`onConflictDoUpdate`'s `set` is not the same list as `values`.** Flipping a literal
  in `.values()` only affects a brand-new row. Reconciling an existing row needs the
  same key added to `set`, or the flip only ever applies going forward.
- **The claim action re-derives everything `load` already knows.** SvelteKit actions
  don't share request state with the sibling `load` — re-fetching the artist and
  re-checking `origin`/`claimedAt` inside `claimArtist` is not redundant, it's the only
  way the action sees current data.
- **`hasAccess` used to be one boolean gating three unrelated things** (fetch, connect,
  render). Splitting it into `canRead`/`canWrite` only helps if every one of the three
  call sites is updated to the right half — the composer must read `canWrite`, not
  `canRead`, or an anonymous seeded-room visitor could post.
- **`kind` must come from a server-side artist lookup, never a client-sent value** — a
  claimed artist and an unclaimed one hit the exact same `POST
/api/artist/[id]/subscription` with no body to trust either way.

## 6. Verification

```
yarn vitest --run --project server   # 541 green (was 524 before this slice)
yarn vitest --run --project client   # 101 green (was 94 before this slice)
yarn run check                       # 0 errors (68 pre-existing warnings, same as S2a)
yarn lint                            # 0 errors after the svelte/no-navigation-without-resolve
                                      # disable on the Audius attribution link (external
                                      # DB-sourced URL, same precedent as admin/+page.svelte)
```

Migration: `drizzle/migrations/0004_square_arachne.sql`, reviewed before
`yarn db:migrate` (one `CREATE TABLE`, two FKs, one unique index — no destructive
statement).
