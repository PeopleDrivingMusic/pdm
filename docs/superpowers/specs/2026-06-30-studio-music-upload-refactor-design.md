# Studio Music Upload — Architecture Refactor & Redesign

**Date:** 2026-06-30
**Branch:** `feature/studio-music-upload-refactor` (from `feature/studio-content`)
**Status:** Design approved pending user review

## 1. Goal & Scope

Refactor the Studio "Music" feature so that (a) music upload is **architecturally
isolated behind a Music/Catalog application-service boundary** ready to extract into a
microservice, (b) the Studio Music UI is **redesigned** into a beautiful, intuitive,
responsive experience for managing albums and individual tracks, and (c) tracks and
albums gain a **visibility gate** (`public` default | `subscribers_only`) that is the
core lever of PDM's $1/mo subscription model.

This is one spec, implemented in phases. Built for scale (direct-to-R2, stateless,
microservice-ready) and hardened against abuse.

### Locked decisions (from brainstorming)

1. **Scope:** everything in one spec, phased — Music boundary + upload unification →
   gates → event-seam → UI redesign.
2. **Event-seam only:** ship an `EventPublisher` interface + `LogEventPublisher`
   (in-process). **No RabbitMQ infra now.** The transactional-outbox design is
   documented (§7) for when processing lands, but the table is **not** created in this
   branch.
3. **Gates on both track and album, with album→track inheritance.**
4. **Gate enforcement is studio-side only in this branch.** We add the column, write
   it from Studio, show it in the UI, and document the listener-side enforcement seam
   (§6.4). Real enforcement (SubscriptionService + playback/listing guards) is a
   **separate follow-up branch**.
5. **Design = evolution of the existing token system** (dark studio aesthetic), not a
   new visual language.
6. **UX scope = focused MVP.** Tabs (All/Albums/Tracks) + redesigned cards/rows +
   Upload Dock/Composer + GateControl + unified status/gate badges + responsive + a11y.
   Search, filter-chips, sort, bulk-select, and sparklines are **backlog**, not this
   branch.
7. **Strict TDD + ≥90% coverage on the server seam.** All server-side boundary code
   (`src/lib/server/music/`, `src/lib/server/events/`, and the upload validation/key
   logic in `src/lib/server/media/`) is built **test-first** (red → green → refactor)
   and must reach **≥90% line+branch coverage**, enforced as a CI gate (§10.1).
8. **Reusable UI molecules live in `src/lib/ui/`, are catalogued, and are tested.** Any
   genuinely reusable interface component introduced by this work goes into
   `src/lib/ui/` (not buried in route `components/`), is registered in the wiki UI
   catalogue, and ships with component tests + e2e coverage (§5.0, §10.3).

### Out of scope (explicitly)

- Listener-side gate enforcement, `SubscriptionService`, playback/listing guards.
- RabbitMQ infrastructure, transcoding/processing workers, `events.outbox` table.
- Search / filter / sort / bulk-select / per-track sparklines.
- Drag-to-reorder of album tracks (leave a callback seam, do not implement).
- Redis-backed rate limiting (in-memory stopgap only this branch — see §6.3).

## 2. Current State (grounding)

- `src/routes/studio/music/StudioMusicPage.svelte` — ~1480-line monolith owning all
  state, the entire client upload pipeline, and all markup.
- `src/routes/studio/music/+page.server.ts` — `load` + 10 actions; reaches directly
  into `AlbumService`/`TrackService`/`GenreService`/`AlbumTrackService` and **mixes two
  upload paths**: `createTrack`/`finalizeTrackUpload`/`resumeTrackUpload` use modern
  direct-to-R2 (`MediaUploadService`, multipart + resume), but `createAlbum`,
  `updateAlbum`, and `updateTrack` use the legacy **server-buffered**
  `$lib/server/upload.ts` (file flows through the app server; `deleteFile()` is a no-op
  stub → album covers leak in R2 on delete).
- `src/lib/server/media/MediaUploadService.ts` — the Media seam (presign single PUT +
  multipart, `renewStoredTarget`, `completeMultipart`, `verifyObject`). Good shape.
- `src/lib/db/schemas/catalog.ts` — `tracks`/`albums` have `isPublished` + `status`,
  **no `visibility`, no `content_id`**.
- `src/lib/utils/helpers.ts` — `uploadR2Target` already implements an `onProgress`
  callback that the UI **never wires up** (today: spinner only, no %).
- `src/lib/ui/FileUpload.svelte` — single-file; its drag&drop is cosmetic (label-only,
  no real drop handlers). A new `UploadDropzone` is required for multi-file drag&drop.
- No Music application-service boundary, no event/outbox seam exist.

### Load-bearing logic that MUST NOT regress

- The exact `FormData` contract `handleTrackSubmit` builds for `?/createTrack`
  (`metadata`, `type`, `file_name`, `file_size`, `cover_type/title/size`).
- `uploadR2Target` resume keys `pdm:track-upload:${trackId}:${audio|cover}` and the
  multipart part-state localStorage format.
- Retry ×3 + `750ms*attempt` backoff + `renewTrackUploadTargets` (`?/resumeTrackUpload`)
  → finalize order; `clearUploadResumeState` on success.
- Object-URL revocation for cover previews on job removal AND on teardown.
- `TrackRow` busy/failed derivation merging controller `job.state` with `track.status`
  (`pending_upload|processing|failed|uploaded`).
- `finalizeTrackUpload` server-side verification + `failed` status writeback.

## 3. Architecture

### 3.1 Layers

```
UI (Svelte 5 components)
  → SvelteKit route actions / +server.ts          (thin: auth + parse + delegate)
    → MusicApplicationService  (src/lib/server/music)   ← NEW boundary (the seam)
        → MediaUploadService   (src/lib/server/media)   (R2 only; sole @aws-sdk importer)
        → TrackService/AlbumService/AlbumTrackService/GenreService (DB)
        → EventPublisher       (src/lib/server/events)  ← NEW seam
```

**Discipline (keeps the seam real):** boundary methods take `artistId` explicitly and
enforce ownership; return **DTOs** (plain shapes), never Drizzle row types; no DB
sessions/transactions assumed to span Music↔Media; heavy bytes go browser→R2, never
through the app server.

### 3.2 `src/lib/server/music/` (new)

```
src/lib/server/music/
  MusicApplicationService.ts   // the seam Studio routes call
  dto.ts                       // TrackDTO, AlbumDTO, UploadTargetDTO, overview DTO, Visibility
  index.ts                     // re-exports
```

DTOs (return R2 **keys**, not signed URLs; visibility + status typed):

```ts
export type Visibility = 'public' | 'subscribers_only';
export type TrackUploadStatus = 'draft' | 'pending_upload' | 'uploaded' | 'ready' | 'failed';

export interface TrackDTO {
	id;
	artistId;
	albumId: string | null;
	title;
	duration: number | null;
	audioKey: string | null;
	imageKey: string | null;
	genres: string[];
	status: TrackUploadStatus;
	visibility: Visibility;
	isPublished: boolean;
	trackNumber: number | null;
	createdAt;
	updatedAt;
}
export interface AlbumDTO {
	id;
	artistId;
	title;
	description: string | null;
	coverImageKey: string | null;
	releaseDate: string | null;
	genres: string[];
	visibility: Visibility;
	isPublished: boolean;
	createdAt;
	updatedAt;
}
export interface StudioMusicOverviewDTO {
	albums: AlbumDTO[];
	tracks: { track: TrackDTO; stats: TrackStatsDTO | null }[];
	albumTracks: AlbumTrackDTO[];
	genres: GenreDTO[];
	stats: StudioStatsDTO;
}
export type UploadIntent = { fileName: string; contentType: string; size: number };
```

**Method → current-action mapping** (every route action becomes a thin wrapper):

| Boundary method                                                          | Replaces / wraps                                |
| ------------------------------------------------------------------------ | ----------------------------------------------- |
| `getStudioOverview(artistId)`                                            | the entire `load` block                         |
| `createAlbum(artistId, input)` → `{album, coverUpload?}`                 | `createAlbum` (cover now presigned)             |
| `updateAlbum(artistId, albumId, patch)` → `{album, coverUpload?}`        | `updateAlbum` (+ visibility cascade)            |
| `deleteAlbum(artistId, albumId)`                                         | `deleteAlbum` (+ R2 cover cleanup — fixes leak) |
| `createTrack(artistId, input)` → `{track, uploadTargets}`                | `createTrack`                                   |
| `resumeTrackUpload(artistId, trackId)` → `{track, uploadTargets}`        | `resumeTrackUpload`                             |
| `finalizeTrackUpload(artistId, trackId, {audioParts, coverUploaded})`    | `finalizeTrackUpload` (+ emit `track.uploaded`) |
| `updateTrackMetadata(artistId, trackId, patch)`                          | metadata branch of `updateTrack`                |
| `replaceTrackAudio(artistId, trackId, audio)` → `{track, uploadTargets}` | audio branch of `updateTrack` → presigned       |
| `replaceTrackImage(artistId, trackId, image)` → `{track, uploadTargets}` | image branch of `updateTrack` → presigned       |
| `deleteTrack(artistId, trackId)`                                         | `deleteTrack`                                   |
| `linkTrackToAlbum(artistId, albumId, trackId, n)`                        | `linkTrackToAlbum` (+ inherit visibility)       |
| `unlinkTrackFromAlbum(artistId, albumId, trackId)`                       | `unlinkTrackFromAlbum`                          |

The route stops importing `$lib/db/queries` and `$lib/server/upload`.

### 3.3 `src/lib/server/events/` (new)

```ts
// types.ts
export type DomainEvent =
	| { type: 'track.uploaded'; trackId; artistId; occurredAt: string }
	| { type: 'track.published'; trackId; artistId; occurredAt: string }
	| {
			type: 'track.visibility_changed';
			trackId;
			artistId;
			visibility: Visibility;
			occurredAt: string;
	  }
	| { type: 'track.deleted'; trackId; artistId; occurredAt: string }
	| {
			type: 'album.visibility_changed';
			albumId;
			artistId;
			visibility: Visibility;
			trackIds: string[];
			occurredAt: string;
	  };

export interface EventPublisher {
	publish(event: DomainEvent): Promise<void>;
}
```

```ts
// LogEventPublisher.ts — shipped now
export class LogEventPublisher implements EventPublisher {
	async publish(event: DomainEvent) {
		logger.info('domain.event', { component: 'events', metadata: { event } });
	}
}
// index.ts
export const eventPublisher: EventPublisher = new LogEventPublisher();
```

Called inside `MusicApplicationService` **after** the DB write succeeds. The boundary
depends only on the `EventPublisher` interface — the impl is the swap point for the
future outbox/RabbitMQ producer (§7).

## 4. Database changes

`src/lib/db/schemas/catalog.ts` — add to **both** `tracks` and `albums`:

```ts
visibility: varchar('visibility', { length: 16 }).default('public').notNull(),
```

And to `tracks` only (seam for future processing; nullable, unused this branch):

```ts
contentId: uuid('content_id'),
```

Rationale for `varchar` over a pg enum: matches the existing `status` varchar pattern
and the content domain's app-level visibility validation. Validate
`'public' | 'subscribers_only'` in the boundary.

Workflow per CLAUDE.md: edit `catalog.ts` → update `schema.ts` aggregator/relations/
type exports (the `$inferSelect/$inferInsert` exports pick up new columns automatically;
confirm no manual type omissions) → `yarn db:generate` → review SQL → `yarn db:migrate`.
Migration is **additive and safe** (defaults backfill existing rows).

### Inheritance semantics (locked)

- **On link** (`linkTrackToAlbum`): the track's `visibility` is **overwritten** to the
  album's `visibility`.
- **On album visibility change** (`updateAlbum`): cascade to **all currently-linked
  tracks** (loop `albumTracks` → `TrackService.updateTrack`), emit
  `track.visibility_changed` per track + one `album.visibility_changed`.
- **On unlink:** the track keeps its current value (no revert).
- Standalone (unlinked) tracks own their `visibility` independently.
- Cascade iterates the `albumTracks` join table, **not** the vestigial `tracks.albumId`.

## 5. UI Redesign

### 5.0 Reusable UI molecules policy (rule for this work)

Distinguish **reusable primitives/molecules** (no feature/domain coupling — usable on
any screen) from **feature components** (orchestration that knows about music/albums/
tracks). The split is mandatory, not stylistic:

- **Reusable → `src/lib/ui/`.** Generic molecules go here, take only generic props +
  callbacks, import no `$lib/server`/route data, and are documented + tested (§10.3).
  New reusable molecules introduced by this work:
  - `Badge.svelte` — generic status/label badge (variant + icon + text); dark-correct
    tint pairs. (Replaces today's ad-hoc per-screen status pills.)
  - `SegmentedControl.svelte` — generic 2+ option segmented control (`$bindable value`,
    options, icons, `aria-pressed`/arrow-key nav).
  - `VisibilityToggle.svelte` — platform gate control (`public | subscribers_only` +
    inheritance cue), composed on top of `SegmentedControl`. Reusable because the gate
    is a platform-wide concept (the content domain has the same notion).
  - `UploadDropzone.svelte` — generic real drag&drop + multi-file picker (`onFiles`,
    `accept`, `maxSizeMb`, keyboard-operable). The missing real-drop surface;
    `FileUpload.svelte` stays for single-file.
  - **Reuse, don't duplicate:** the existing `src/lib/ui/Progress.svelte` is the
    determinate progress bar — extend it if needed rather than adding a new one. Audit
    `Tabs`, `Modal`, `IconButton`, `StatCard`, `Select`, `Checkbox`, `Button` for reuse
    before creating anything.
- **Feature-specific → `src/routes/studio/music/components/`.** Anything that knows
  about the music domain or orchestrates this screen.

Every reusable component added/changed here is registered in the wiki UI catalogue
(`.claude/wiki/product/design-system.md`, extended with a "UI component inventory"
section: name, path, purpose, props summary, test status) — so we always know what
exists and avoid re-inventing molecules. Updating that catalogue is a checklist item of
the UI phase (§9.7), and a `feedback` memory records the "reusable → `ui/` + catalogue +
tests" rule for future sessions.

### 5.1 Component decomposition

```
src/lib/ui/                          ← REUSABLE molecules (generic, tested, catalogued)
    Badge.svelte                     NEW status/gate badge
    SegmentedControl.svelte          NEW generic segmented control
    VisibilityToggle.svelte          NEW gate control (composes SegmentedControl)
    UploadDropzone.svelte            NEW real drag&drop + multi-file
    Progress.svelte                  EXISTING — reuse for determinate bars

src/routes/studio/music/             ← FEATURE components (music-coupled)
  +page.svelte                      (unchanged: <MusicCatalogShell {data} />)
  +page.server.ts                   (thin wrappers over MusicApplicationService)
  components/
    MusicCatalogShell.svelte        orchestrator (replaces StudioMusicPage)
    MusicStatsBar.svelte            pure; wraps StatCard
    UploadDock.svelte               persistent queue panel (survives tab switch/nav)
    UploadQueue.svelte              list of TrackUploadJobCard
    TrackUploadJobCard.svelte       per-file progress / status / retry (uses Progress)
    AlbumGrid.svelte / AlbumCard.svelte
    TrackList.svelte / TrackRow.svelte
    AlbumFormModal.svelte / TrackFormModal.svelte / LinkTrackModal.svelte

src/lib/studio/music/
    uploadController.svelte.ts       NEW rune-backed factory controller
    types.ts                         TrackUploadJob, StudioTrack, StudioAlbum
```

`MusicCatalogShell` is the only stateful page-level component: holds `$derived` slices
of `data`, modal flags, editing targets, and the **upload controller instance**. All
children are pure/presentational and receive props + callbacks. Tabs use the existing
`src/lib/ui/Tabs.svelte`: `All | Albums | Tracks`.

### 5.2 Upload controller (`uploadController.svelte.ts`)

A **factory** `createUploadController()` (not a global singleton — jobs hold `File`
handles + object URLs that must be revoked on teardown; a singleton would leak across
Studio navigations / artist switches). Instantiated in `MusicCatalogShell`, torn down
via `onDestroy` → `controller.destroy()` revokes all previews.

Moves verbatim from the monolith (preserving semantics): `postAction`, `storageKey`,
`wait`, cover-preview create/revoke, `renewTrackUploadTargets`, `runTrackUpload`,
`retryTrackUpload`, job add/remove. **Only behavioral change:** thread
`onProgress: (p) => updateJob(id, { progress: p })` into both `uploadR2Target` calls so
`TrackUploadJobCard` renders a true percentage (sum of completed 8 MB parts / total).
Add a **concurrency cap** (2–3 active jobs; extras stay `queued`) so batch uploads don't
saturate the connection / trip R2 CORS.

Job shape:

```ts
type JobState = 'queued' | 'uploading' | 'finalizing' | 'uploaded' | 'failed';
interface TrackUploadJob {
	trackId;
	title;
	audioFile: File;
	coverFile: File | null;
	uploadTargets;
	coverPreviewUrl: string | null;
	state: JobState;
	progress: number;
	error: string;
	attempt: number;
}
```

### 5.3 Upload UX (centerpiece)

- **Entry points:** header split button `[Upload tracks ▾]` (primary) / `[New album]`;
  drag a file **anywhere** on the page → full-bleed drag-over scrim → opens Composer
  preloaded; empty-state panel doubles as a live dropzone.
- **Upload Composer** (wide modal / full-screen sheet on mobile): top `UploadDropzone`
  (multi-file), then a **per-file queue** of cards — auto cover thumb (ID3 via
  `extractTrackMetadata`), editable title (auto from ID3/filename), duration, file
  size, **per-file GateControl** (defaults Public or inherits chosen album),
  album-select (link now / standalone), remove. A **batch gate** ("Set all to:
  Public | Subscribers-only") at the queue top. Footer: Cancel · **Upload N tracks**.
- **Batch = a loop over the existing per-track pipeline** (no new server infra): for
  each audio file → `extractTrackMetadata` → build the same `createTrack` `FormData` →
  POST → `controller.enqueueFromCreateResult(result, files)` → `runTrackUpload`.
- **Upload Dock** (persistent, bottom-right; full-width bottom bar on mobile): on
  submit the Composer collapses into the Dock so uploads survive tab switches /
  navigation. Header "Uploading 9 of 12 · 1 failed" + aggregate ring; collapse to a
  pill. Dismiss blocked / confirmed while jobs run. Each job mirrors onto its eventual
  `TrackRow` (dimmed cover + status).

Per-file states (icon + text, never color-only): `queued` "Ready" · `uploading`
"Uploading 42% · 12.4/28 MB" (determinate bar) · `finalizing` "Verifying audio" ·
`uploaded` "Uploaded" (then fades) · `failed` real error + **Retry** (≥44px).

### 5.4 VisibilityToggle

```ts
{
  value: 'public' | 'subscribers_only';   // $bindable
  level: 'album' | 'track';
  inheritedFrom?: 'album' | null;
  disabled?: boolean;
  onChange?: (v) => void;
}
```

Two-state **segmented control** in edit contexts (Public = neutral default, first
position; Subscribers-only = amber `--gate-accent` + lock, with a one-line helper "Only
your $1/mo subscribers can play this"). In display contexts a **badge**: Public is
silent (omitted to keep the catalog calm); Subscribers-only renders an amber lock pill.
Inheritance: a track inside a gated album shows a faint outline lock "Subscribers (from
album)" until explicitly overridden (an "Override" affordance enables local editing);
the album header notes "6 of 8 tracks subscribers-only". Effective gate (documented in
code) = track's own visibility if set, else album's, else public.

### 5.5 Album & track surfaces

- **AlbumCard:** 1:1 cover with gate badge (top-left) + status badge (top-right);
  title, clamped description, meta (release date `tabular-nums`, genres, track count);
  collapsible inline linked-track list (number · title · gate dot · kebab); footer
  actions (Edit · gate quick-toggle · Publish · Delete — danger spatially separated).
  `focus-within` ring (don't rely on hover).
- **TrackRow:** cover (with determinate upload ring when in-flight) · title + album
  link · duration · GateControl · status badge · plays/likes/saves (`tabular-nums`) ·
  `⋯` (Edit, Replace audio, Manage albums, Lyrics, Delete). Keeps the busy/failed
  derivation from props.
- **Unified status/gate badge component** with dark-correct tints (bright `-300` text
  on 16%-opacity same-hue tint over `gray-800`): Draft / Published / Scheduled /
  Uploading / Failed. Replaces today's light-mode `success-100/700` pill.

### 5.6 States, responsiveness, a11y

- **Empty (first run):** centered panel that **is** a live dropzone; "Upload your first
  track". **Filtered-empty / load-error / action-error:** inline retry / themed
  notifications (no dead ends). **Loading:** skeletons (reserve heights → CLS < 0.1),
  reduced-motion safe.
- **Breakpoints** (existing mixins 639/640/1024/1280): stats bento 6→3→2→1; Albums grid
  `auto-fill minmax(280px)` → 1 col on phones; TrackRow collapses to a 2-row card on
  mobile (stats/actions behind `⋯`); Composer → full-screen sheet; Dock → full-width
  bottom bar (safe-area). Inputs ≥16px, touch targets ≥44px, no horizontal content
  scroll.
- **a11y:** Dock `aria-live="polite"` with **threshold** announcements (not per-%);
  bars `role="progressbar"` + values; failures `role="alert"`. Gate never color-only
  (lock icon + "Subscribers" text). Real focusable dropzone (Enter/Space → file
  picker), arrow-key segmented gate. Themed confirm modal replaces native `confirm()`.
  All decorative motion behind `prefers-reduced-motion`.

### 5.7 Design tokens (extend existing system)

Add to `src/styles/tokens.css` (+ dark overrides), referencing existing primitives —
gate accent (`--gate-accent` = brand amber, own token so it never clashes with the
single primary button per region), gate tints, upload progress colors
(`--upload-progress` info-blue, `--upload-progress-done` success, `--upload-failed`),
dark-correct status badge tint pairs, dropzone/selection/toolbar surfaces. Also migrate
`StatCard.svelte` off `@media (prefers-color-scheme: dark)` to the app's
`[data-theme="dark"]` tokens (theming inconsistency fix). Color language: **amber = the
gate (premium)**, **blue = in-progress (uploading)**, **green = done/live** — each
always paired with icon + word.

### 5.8 Data flow

- Children consume `$derived` slices from `MusicCatalogShell`; never reach into `data`.
- **`use:enhance`** for simple CRUD modals (album/track/link create/update/delete/
  unlink). **Programmatic `fetch` + `deserialize`** (controller `postAction`) for the
  upload lifecycle (`createTrack → resumeTrackUpload → finalizeTrackUpload`) because
  batch runs a loop reacting to returned `uploadTargets`.
- `invalidateAll()` after finalize and after CRUD (re-derives stats/lists). The
  `UploadQueue`/Dock is the optimistic surface; jobs collapse into real `TrackRow`s on
  invalidate.

## 6. Security hardening ("защита от хакерских атак")

1. **Ownership / IDOR (high):** before issuing ANY track/album-scoped presigned target
   (create-track, album cover, `upload-target` endpoint, resume), load the record and
   assert `record.artistId === artistId`; **build the R2 key server-side from the
   verified record** — never trust a client-passed `trackId`/`albumId`/key. Preserve
   the existing correct pattern in `finalize`/`resume` (target read from DB metadata,
   not request body).
2. **Audio size/MIME enforcement (high):** `createTrack` currently only checks
   `file_size > 0`. Enforce server-side **before presigning**: audio MIME allowlist
   (`audio/mpeg, audio/mp3, audio/wav, audio/x-wav, audio/wave`) + `MAX_AUDIO_SIZE`
   (e.g. 100 MB); images allowlist (`image/jpeg, image/png, image/webp`) + 10 MB. Cap
   derived multipart `partCount` (unbounded `signMultipartParts` loop = DoS vector).
   Reuse the allowlists currently in `upload.ts` before retiring it for music.
3. **Rate limiting (high, absent):** per-artist limits on `createTrack` /
   `upload-target` / `resume`. **In-memory per-instance stopgap this branch** (no Redis
   infra); documented for a Redis token-bucket upgrade later.
4. **Endpoint origin check (medium):** the JSON `upload-target` endpoint is not covered
   by SvelteKit's form-only `checkOrigin`; add an explicit `Origin`/`Sec-Fetch-Site`
   check. R2 creds stay server-only.
5. **R2 bucket CORS:** scope `AllowedOrigins` to app domains (not `*`), methods to
   `PUT`/`GET` (required for direct browser uploads; document the policy).
6. **Orphan cleanup (medium):** `abortMultipartUpload` exists but is never called, and
   `finalize` on verify-fail doesn't delete the R2 object → billable orphans. Add: (a)
   an R2 lifecycle rule to abort incomplete multipart uploads after N days (documented),
   (b) delete the R2 object on verify-fail, (c) call `deleteFileFromR2` for album cover
   on delete/replace (fixes the current leak). A periodic sweeper for stale
   `pending_upload`/`failed` rows is documented as follow-up.
7. **Residual trust (documented):** `verifyObject` checks existence + size, not content
   bytes; a client can PUT arbitrary bytes under an audio content-type. Real validation
   is deferred to the future transcoding/Media service.

### 6.4 Listener-side enforcement seam (documented, NOT built this branch)

`subscribers_only` is currently **unenforceable**: `src/routes/api/music/[id]/+server.ts`
issues a signed audio URL with **no auth / ownership / visibility check**, and there is
no `SubscriptionService`. This spec adds the column + studio writes; the follow-up branch
must: add `SubscriptionService.hasActiveSubscription(userId, artistId)` (against
`finance.purchases`), guard the playback endpoint (require active subscription when
effective visibility is `subscribers_only`), and filter listing queries. `playableTrackStatus()`
stays status-only. **This is flagged loudly so the gate is not mistaken for enforced.**

## 7. Event-seam & future processing (documented)

Shipped now: `EventPublisher` interface + `LogEventPublisher` (§3.3). Documented future
path (not built):

- **Transactional outbox:** `events.outbox(id uuid pk, aggregate_type, aggregate_id,
type, payload jsonb, created_at, published_at null, attempts, status)`. A future
  `OutboxEventPublisher` inserts the event **in the same transaction** as the track
  mutation (atomic, no cross-domain transaction); an in-process relay drains
  `published_at IS NULL`. This is the swap point — `finalizeTrackUpload` is untouched
  when the impl changes.
- **RabbitMQ later:** add a `rabbitmq:3.13-management` compose service (amqp 5672 +
  mgmt 15672, prometheus plugin :15692), swap the relay sink to a `RabbitMqEventPublisher`
  (topic exchange `pdm.events`, routing key = event type), stand up a transcoder
  consumer on `track.processing.requested` that writes variants to R2 and emits
  `track.processing.completed` with a `content_id` → status `ready`. This is the
  Media-service extraction milestone. `tracks.content_id` is added now so the contract
  exists.

## 8. Observability

Wire the already-defined `recordMusicUpload(format, success)` (currently never called)
at finalize. Add upload counters (`media_upload_started/finalized/failed_total{kind,...}`),
duration histograms (createTrack→finalize, finalize, R2 op), a `media_pending_uploads`
gauge, and an R2 error counter (route `deleteFileFromR2`'s swallowed errors through
`logger`/`MetricsCollector`). Structured logs (with `requestId` + `artistId` + `trackId`

- `key`) at presign issued / finalize start / verify result / failure; rejected uploads
  via `logger.security(...)`. All flows through the existing prom-client `/api/metrics` +
  Loki/Grafana stack — **no new infra**.

## 9. Implementation phases

All server-side phases (1, 3–6) are done **test-first** (§10.1) and must keep the seam
at **≥90% coverage** before the phase is considered done.

1. **Security baseline (cheap, first):** audio/image MIME+size allowlists + max, cap
   `partCount`, origin check on the JSON endpoint, in-memory per-artist rate limit,
   document bucket CORS. (No new infra.)
2. **Schema:** add `visibility` (tracks + albums) + `content_id` (tracks); aggregator/
   relations/types; generate + migrate (additive).
3. **Music boundary:** create `src/lib/server/music/MusicApplicationService.ts` + DTOs
   wrapping today's exact behavior; refactor `+page.server.ts` to thin wrappers; stop
   importing `$lib/db/queries` + `$lib/server/upload`. Behavior-preserving.
4. **Event seam:** `src/lib/server/events/` + `LogEventPublisher`; wire
   finalize/visibility/publish/delete emissions.
5. **Visibility write-side:** accept `visibility` in create/update actions; implement
   link inherit + album cascade + `*.visibility_changed` events.
6. **Upload unification:** `createAlbumCoverUpload` (new Media kind), extend
   `upload-target` endpoint (kinds + ownership + validation), convert album cover +
   track audio/image edits to presigned flow, fix album-cover R2 cleanup, remove
   music's dependency on `$lib/server/upload.ts` (grep for other importers first; leave
   the module if non-music callers remain).
7. **UI redesign:** tokens + StatCard theming fix → **reusable `src/lib/ui/` molecules
   first** (`Badge`, `SegmentedControl`, `VisibilityToggle`, `UploadDropzone`), each with
   component + e2e tests (§10.3) and a wiki-catalogue entry
   (`.claude/wiki/product/design-system.md`) → feature decomposition +
   `uploadController` extraction (with `onProgress` + concurrency cap) →
   UploadDock/Composer → cards/rows → empty/loading/error + a11y pass. Record the
   "reusable → `ui/` + catalogue + tests" rule as a `feedback` memory.
8. **Observability:** counters/histograms/logs, wire `recordMusicUpload`, Grafana panel.

Each phase is independently shippable and reversible. Phases 1–3 harden + isolate
without UI change; 4–6 add gates + unify uploads; 7 redesigns; 8 instruments.

## 10. Testing

### 10.1 Strict TDD + coverage gate (server seam)

The server boundary is built **test-first**: for each `MusicApplicationService` /
`EventPublisher` / media-validation behavior, write a failing test → minimal code to
pass → refactor. No boundary code lands without a test written first (enforced via the
superpowers `test-driven-development` workflow during implementation).

**Coverage gate ≥90% (line + branch)** over the seam:
`src/lib/server/music/**`, `src/lib/server/events/**`, and the new validation/key code
in `src/lib/server/media/**`. Configure vitest coverage (`@vitest/coverage-v8`) with a
`server`-project threshold scoped to these paths (`coverage.thresholds` +
`coverage.include`) so the gate measures the seam, not the whole repo. Add a
`yarn test:coverage` script; the gate runs in CI and blocks merge if below 90%.

### 10.2 Server seam unit tests (vitest, node)

`MusicApplicationService` ownership enforcement (reject cross-artist); visibility
inherit-on-link + album cascade + no-revert-on-unlink; DTO mapping (assert **no Drizzle
row/`$inferSelect` shape leaks** across the boundary); MIME/size validation + `partCount`
cap + audio/image allowlists; server-side artist-namespaced key derivation (client
cannot influence the key); `LogEventPublisher` emission on finalize / visibility-change /
publish / delete; album-cover R2 cleanup on delete/replace.

### 10.3 Reusable UI molecule tests (vitest client + playwright e2e) — required

Every reusable molecule in `src/lib/ui/` introduced/changed here ships with tests
(this also seeds the currently-empty `src/lib/ui/` test suite):

- **Component tests (vitest `client` project, `*.svelte.spec.ts`):** `Badge` (variant →
  correct tint/icon/text, color-not-only), `SegmentedControl` (select, `aria-pressed`,
  arrow-key nav, disabled), `VisibilityToggle` (public default, switch to
  subscribers_only, inherited/override states + cue), `UploadDropzone` (drag-over state,
  multi-file accept, type/size rejection, keyboard Enter/Space opens picker).
- **e2e (playwright):** each reusable molecule is exercised in a real flow (the music
  screen), and at least `VisibilityToggle` + `UploadDropzone` get a dedicated e2e
  assertion (gate flip persists + inherited badge; real drag&drop multi-file).

### 10.4 Upload controller tests (vitest, client)

`uploadController` job lifecycle queued→uploading→finalizing→uploaded; `onProgress`
threading updates `job.progress`; retry ×3 + backoff + `renewTrackUploadTargets`;
concurrency cap (extras stay `queued`); cover-preview revocation on `destroy()`.

### 10.5 e2e flows (playwright)

Drag&drop multi-file upload happy path (mocked R2 targets); per-file progress + retry on
induced failure; album cover presigned upload; set track/album visibility + observe
inherited badge; responsive layout smoke (mobile/desktop); Upload Dock survives tab
switch.

### 10.6 Regression guards & gates

- Golden tests assert the `createTrack` `FormData` contract, resume-key format
  (`pdm:track-upload:${trackId}:${audio|cover}`), and retry→finalize order are unchanged.
- Run `yarn check` + `yarn lint` after each phase; `yarn test:coverage` (server gate) +
  `yarn test` (full unit + e2e) before merge.
