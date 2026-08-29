# Seeded Artist Profiles — Slice S1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import unclaimed artist profiles and their tracks from Audius into PDM's own tables — idempotently, behind a service boundary, and **invisible to users until slice S2b deliberately reveals them**.

**Architecture:** A new application-service boundary at `src/lib/server/catalog-source/` owns the outside world. `AudiusAdapter` turns HTTP responses into our own `ExternalArtist` / `ExternalTrack` DTOs; `CatalogSourceService` applies the per-artist gates and maps DTOs onto plain row shapes; `CatalogImportRepository` in the DB layer performs idempotent, claim-safe upserts keyed on `(origin, external_id)`. No Audius response type and no Drizzle row crosses the service boundary in either direction, and the DB layer never imports from `$lib/server`. Seeded artists reuse the existing `artist.artists` table behind an `origin` discriminator, so every existing FK, query and page keeps working.

**Tech Stack:** SvelteKit 2 · TypeScript · Drizzle ORM 0.45.2 / drizzle-kit 0.31.x · Postgres (`postgres-js`) · Vitest (`server` project) · yarn

**Spec:** `docs/superpowers/specs/2026-08-29-seeded-artist-profiles-design.md`

**Revision:** v2, rewritten 2026-08-29 after an independent review of v1 found six real defects. They are listed in "What v1 got wrong" at the end — read it if a step looks oddly defensive, before deciding to simplify it.

## Global Constraints

- Package manager is **yarn**. Never `npm`.
- Indentation is **tabs** (`.prettierrc`). Run `yarn format` before committing.
- Run **`yarn run check`** after changes; it must stay at **0 errors**. Plain `yarn check` silently runs yarn 1's built-in integrity check instead of the project script — it prints "Folder in sync" and type-checks nothing. (CLAUDE.md has the same mistake.)
- Vitest runs with `expect: { requireAssertions: true }` — **every** test must assert. The node-side project is named **`server`** (not "node").
- Migration flow: edit the domain schema file → `yarn db:generate` → **read the generated SQL** → `yarn db:migrate`. **Never `yarn db:push`** against the shared dev DB.
- **A `vi.fn()` with no declared parameters types `mock.calls` as an empty tuple**, so `mock.calls[0][0]` fails `svelte-check` with "Tuple type '[]' of length '0' has no element at index '0'". Declare the parameter — `vi.fn((_row: Record<string, unknown>) => …)` — rather than casting the result.
- **`vi.mock` factories must not dereference module-level `const`s.** The factory runs when the mocked module is first imported, before top-level `const`s initialise, so a bare `const insert = vi.fn()` read inside the factory throws `ReferenceError: Cannot access 'insert' before initialization`. Wrap such mocks in `vi.hoisted()` — `src/lib/db/services/ChatRepository.spec.ts:26` is the pattern this repo already uses.
- `vi.mock` is module-scoped and hoisted: one factory per module per file. Two test groups needing different mock shapes for the same module go in different spec files.
- Audius base host is `https://api.audius.co/v1`. Send `app_name=PDM` on every request. No API key, no auth.
- **No Audius response type and no Drizzle row crosses `src/lib/server/catalog-source/`.**
- **The DB layer must not import from `$lib/server/*`.** `.claude/wiki/architecture/service-boundaries.md` defines the order as application-service (layer 3) → DB services (layer 4). `CatalogImportRepository` therefore declares its own plain input shapes; the service maps DTO → row.
- `tracks.audioUrl` for an Audius track stores the **stable** endpoint `https://api.audius.co/v1/tracks/{externalId}/stream`. Never store the URL it redirects to — that one is signed with a timestamp and expires.
- **Prefer Drizzle operators (`ne`, `eq`, `isNull`, `and`) over `sql` templates — with exactly one forced exception.** A partial index predicate (`uniqueIndex().where()`) is serialised into the migration file by drizzle-kit as `dialect.sqlToQuery(where).sql`, which **discards `.params`**. `ne(col,'x')` compiles to `col <> $1`, so the generated migration would carry an unbindable `$1` and Postgres would reject it with `there is no parameter $1`. Index predicates MUST use a `sql` template with an inline literal. `targetWhere` / `setWhere` in `onConflictDoUpdate` are the opposite case — they run inside a normal statement, so `ne()` and `isNull()` are correct there. **There are exactly two `sql` templates in this slice, both index predicates. Do not add a third.**
- Wrap notable DB operations in `withDbLogging(name, fn)` from `src/lib/db/index.ts`.
- **Imported rows are hidden by default** (`artists.isActive = false`, `tracks.isPublished = false`). Slice S2b flips them on together with the "unofficial page" notice. Task 3 Step 3 explains why this is not optional.

---

## File Structure

| File                                                           | Responsibility                                                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/lib/db/schemas/artist.ts`                                 | **Modify.** `userId` nullable; add `origin`, `externalId`, `externalUrl`, `claimedAt`; partial unique index |
| `src/lib/db/schemas/catalog.ts`                                | **Modify.** `tracks` gains `audioSource`, `externalId` + partial unique index                               |
| `src/lib/db/schemas/finance.ts`                                | **Modify.** `subscriptions` gains `kind`                                                                    |
| `src/lib/db/schemas/external-origin.spec.ts`                   | **Create.** Asserts the column shape so a domain-file edit can't drift from intent                          |
| `drizzle/migrations/<generated>.sql`                           | **Create** via `yarn db:generate`. Columns and indexes only — **this slice creates no table**               |
| `src/lib/server/catalog-source/types.ts`                       | **Create.** `ExternalArtist`, `ExternalTrack`, `CatalogSource`                                              |
| `src/lib/server/catalog-source/adapters/AudiusAdapter.ts`      | **Create.** HTTP + mapping. The only file that knows Audius field names                                     |
| `src/lib/server/catalog-source/adapters/fixtures/*.json`       | **Create.** Captured responses                                                                              |
| `src/lib/server/catalog-source/adapters/AudiusAdapter.spec.ts` | **Create.** Mapping + per-track gates, no network                                                           |
| `src/lib/db/services/CatalogImportRepository.ts`               | **Create.** Idempotent, claim-safe upserts + its own plain input shapes                                     |
| `src/lib/db/services/CatalogImportRepository.spec.ts`          | **Create.**                                                                                                 |
| `src/lib/server/catalog-source/CatalogSourceService.ts`        | **Create.** Per-artist gates, DTO → row mapping, orchestration                                              |
| `src/lib/server/catalog-source/CatalogSourceService.spec.ts`   | **Create.**                                                                                                 |
| `src/lib/server/catalog-source/index.ts`                       | **Create.** Barrel — the only import path for consumers                                                     |
| `scripts/import-artist.ts`                                     | **Create.** Admin entrypoint                                                                                |
| `vite.config.ts`                                               | **Modify.** Add the new paths to the coverage `include` list                                                |
| `package.json`                                                 | **Modify.** `import:artist` script; declare `vite-node`                                                     |

---

## Task 1: Schema and migration

**Files:**

- Modify: `src/lib/db/schemas/artist.ts` (the `artists` table; `userId` is line 18)
- Modify: `src/lib/db/schemas/catalog.ts` (the `tracks` table; its `artistId` is line 46)
- Modify: `src/lib/db/schemas/finance.ts` (the `subscriptions` table; its `artistId` is line 29)
- Test: `src/lib/db/schemas/external-origin.spec.ts`
- Create: `drizzle/migrations/<generated>.sql`

**Interfaces:**

- Consumes: nothing.
- Produces: `artists.origin`, `artists.externalId`, `artists.externalUrl`, `artists.claimedAt`, nullable `artists.userId`; `tracks.audioSource`, `tracks.externalId`; `subscriptions.kind`; unique indexes `artists_origin_external_unique` and `tracks_source_external_unique`. Types `Artist` / `NewArtist` / `Track` / `NewTrack` (exported from `src/lib/db/schema.ts` and `src/lib/db/index.ts`) widen automatically.

- [ ] **Step 1: Write the failing test**

Create `src/lib/db/schemas/external-origin.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { artists } from './artist';
import { tracks } from './catalog';
import { subscriptions } from './finance';

describe('external-origin columns', () => {
	it('lets an artist exist with no PDM user', () => {
		expect(artists.userId.notNull).toBe(false);
	});

	it('defaults every pre-existing artist to native origin', () => {
		expect(artists.origin.notNull).toBe(true);
		expect(artists.origin.default).toBe('native');
	});

	it('carries the source identity and the attribution link', () => {
		expect(artists.externalId.name).toBe('external_id');
		expect(artists.externalUrl.name).toBe('external_url');
	});

	it('leaves claimedAt nullable so null means unclaimed', () => {
		expect(artists.claimedAt.notNull).toBe(false);
	});

	it('defaults every pre-existing track to r2 audio', () => {
		expect(tracks.audioSource.notNull).toBe(true);
		expect(tracks.audioSource.default).toBe('r2');
	});

	it('keeps the track source id for idempotent re-import', () => {
		expect(tracks.externalId.name).toBe('external_id');
	});

	it('defaults every pre-existing subscription to paid', () => {
		expect(subscriptions.kind.notNull).toBe(true);
		expect(subscriptions.kind.default).toBe('paid');
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test:unit --run src/lib/db/schemas/external-origin.spec.ts`
Expected: FAIL — `artists.origin` is undefined, so reading `.notNull` throws `TypeError: Cannot read properties of undefined`.

- [ ] **Step 3: Add the columns to `schemas/artist.ts`**

Replace the import block and the `artists` table. `uniqueIndex` and `sql` are new imports; leave `artistOnboardingRequests`, `artistAccounts` and `artistSessions` untouched.

```ts
import {
	pgSchema,
	text,
	varchar,
	timestamp,
	boolean,
	integer,
	jsonb,
	uuid,
	decimal,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const artistDbSchema = pgSchema('artist');

export const artists = artistDbSchema.table(
	'artists',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		// Nullable: a seeded artist has no PDM user until they claim the page.
		userId: uuid('user_id').references(() => users.id),
		name: varchar('name', { length: 100 }).notNull(),
		slug: varchar('slug', { length: 100 }).notNull().unique(),
		coverImg: text('cover_img'),
		avatar: text('avatar'),
		genre: varchar('genre', { length: 50 }),
		description: text('description'),
		socialLinks: jsonb('social_links'),
		// 'native' = created on PDM. Anything else names the source it was imported from.
		origin: varchar('origin', { length: 16 }).default('native').notNull(),
		externalId: varchar('external_id', { length: 64 }),
		// Attribution link back to the source profile. Required for imported artists.
		externalUrl: text('external_url'),
		// NULL means unclaimed. Import refuses to modify a row where this is set, and a
		// "was here first" badge is later derived from it.
		claimedAt: timestamp('claimed_at'),
		trust_score: decimal('trust_score', { precision: 3, scale: 2 }).default('3.00').notNull(),
		isActive: boolean('is_active').default(true),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(t) => [
		// Partial: native artists have no external id, and many NULLs would collide.
		// Stays a `sql` template on purpose — drizzle-kit drops bind params when it writes
		// the migration, so `ne()` here would emit an unbindable `$1`. The predicate must
		// also be repeated in every ON CONFLICT that targets this index.
		uniqueIndex('artists_origin_external_unique')
			.on(t.origin, t.externalId)
			.where(sql`${t.origin} <> 'native'`)
	]
);
```

- [ ] **Step 4: Add the columns and index to `schemas/catalog.ts`**

Add `uniqueIndex` to the `drizzle-orm/pg-core` import and `import { sql } from 'drizzle-orm';` at the top of the file.

Inside the `tracks` table definition, directly after the existing `status` line, add:

```ts
		// 'r2' = we host the audio. 'audius' = audioUrl is the stable /stream endpoint.
		audioSource: varchar('audio_source', { length: 16 }).default('r2').notNull(),
		externalId: varchar('external_id', { length: 64 }),
```

And in that table's index array — which already holds `tracks_artist_status_idx` and `tracks_published_status_idx` — add:

```ts
// `sql` template, not `ne()` — same migration-serialisation reason as the
// artists index above.
uniqueIndex('tracks_source_external_unique')
	.on(table.audioSource, table.externalId)
	.where(sql`${table.audioSource} <> 'r2'`);
```

- [ ] **Step 5: Add the column to `schemas/finance.ts`**

**There are two `status:` lines in this file** — line 18 belongs to `purchases`, line 32 to `subscriptions`. Add this after the one at line 32, inside the **`subscriptions`** table:

```ts
		// 'pre_claim_free' rows carry no payment — they must never reach revenue reporting.
		kind: varchar('kind', { length: 16 }).default('paid').notNull(),
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `yarn test:unit --run src/lib/db/schemas/external-origin.spec.ts`
Expected: PASS, 7 tests.

- [ ] **Step 7: Confirm the aggregator needs no edit, then typecheck**

`src/lib/db/schema.ts` re-exports the tables and builds `relations`. This task adds **no new table**, so neither the `schema` const nor any `relations` block changes, and the inferred types widen on their own.

Run: `yarn run check`
Expected: one error, then zero after you fix it. `src/routes/(app)/listen/+page.svelte` builds a
hardcoded `Track` object literal for its empty state, and it no longer satisfies the widened type.
Add `audioSource: 'r2'` and `externalId: null` to it — any new `notNull` column on `tracks` breaks
every literal of that shape, and this is the only one.

Beyond that, every existing reader of `artist.userId` is already null-tolerant (`policy.ts:57,63,73` use `?? null`; `access.ts:86` narrows; `+page.server.ts:14` and `api/music/[id]:24` are `===` comparisons), so a non-zero count means something unexpected — stop and report it rather than patching.

- [ ] **Step 8: Generate the migration and read the SQL**

Run: `yarn db:generate`

Open the new file under `drizzle/migrations/`. It must contain these statements — **in any order, separated by `--> statement-breakpoint` lines, which are normal and expected**:

```sql
ALTER TABLE "artist"."artists" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "artist"."artists" ADD COLUMN "origin" varchar(16) DEFAULT 'native' NOT NULL;
ALTER TABLE "artist"."artists" ADD COLUMN "external_id" varchar(64);
ALTER TABLE "artist"."artists" ADD COLUMN "external_url" text;
ALTER TABLE "artist"."artists" ADD COLUMN "claimed_at" timestamp;
ALTER TABLE "catalog"."tracks" ADD COLUMN "audio_source" varchar(16) DEFAULT 'r2' NOT NULL;
ALTER TABLE "catalog"."tracks" ADD COLUMN "external_id" varchar(64);
ALTER TABLE "finance"."subscriptions" ADD COLUMN "kind" varchar(16) DEFAULT 'paid' NOT NULL;
CREATE UNIQUE INDEX "artists_origin_external_unique" ON "artist"."artists" USING btree ("origin","external_id") WHERE "artist"."artists"."origin" <> 'native';
CREATE UNIQUE INDEX "tracks_source_external_unique" ON "catalog"."tracks" USING btree ("audio_source","external_id") WHERE "catalog"."tracks"."audio_source" <> 'r2';
```

**Stop and report if you see a `DROP TABLE`, a `DROP COLUMN`, or any statement touching a table other than these three** — that means the local schema snapshot had drifted from the DB and this migration would destroy data. A `$1` inside an index predicate is also a stop: it means an operator was used where a `sql` template is required.

- [ ] **Step 9: Apply the migration**

Run: `yarn db:migrate`
Expected: applies cleanly. Existing rows are unaffected — every added column has a default or is nullable, `DROP NOT NULL` never rewrites data, and both partial indexes are empty at creation (every existing `origin` is `'native'`, every `audio_source` is `'r2'`).

- [ ] **Step 10: Commit**

```bash
yarn format
git add src/lib/db/schemas drizzle/migrations
git commit -m "feat(db): allow ownerless artists and external-sourced tracks"
```

---

## Task 2: Audius adapter

**Files:**

- Create: `src/lib/server/catalog-source/types.ts`
- Create: `src/lib/server/catalog-source/adapters/AudiusAdapter.ts`
- Create: `src/lib/server/catalog-source/adapters/fixtures/users-search-deadmau5.json`
- Create: `src/lib/server/catalog-source/adapters/fixtures/user-LKdlD.json`
- Create: `src/lib/server/catalog-source/adapters/fixtures/user-tracks-LKdlD.json`
- Test: `src/lib/server/catalog-source/adapters/AudiusAdapter.spec.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `type CatalogSource = 'audius'`
  - `interface ExternalArtist`, `interface ExternalTrack` — fields in Step 1
  - `AudiusAdapter.searchArtists(query: string): Promise<ExternalArtist[]>`
  - `AudiusAdapter.getArtist(externalId: string): Promise<ExternalArtist | null>`
  - `AudiusAdapter.listTracks(externalId: string): Promise<ExternalTrack[]>`
  - `AudiusAdapter.streamUrlFor(externalId: string): string`
  - `AudiusAdapter.toExternalTrack(raw): ExternalTrack | null`

- [ ] **Step 1: Write the DTO types**

Create `src/lib/server/catalog-source/types.ts`:

```ts
/** Every catalog source we can import from. One today; the seam exists for a second. */
export type CatalogSource = 'audius';

/**
 * An artist as it exists in an external source, already normalised. Nothing
 * source-shaped survives past this type — callers never see Audius field names.
 */
export interface ExternalArtist {
	source: CatalogSource;
	externalId: string;
	handle: string;
	name: string;
	bio: string | null;
	avatarUrl: string | null;
	/** The page banner. */
	bannerUrl: string | null;
	/** Attribution link back to the source profile. */
	externalUrl: string;
	/** Handles the artist published on the source, keyed by network. */
	socials: Record<string, string>;
	followerCount: number;
	trackCount: number;
	isVerified: boolean;
	isDeactivated: boolean;
	/** Bound to the source profile; the basis for cheap claim verification later. */
	walletAddress: string | null;
}

export interface ExternalTrack {
	source: CatalogSource;
	externalId: string;
	title: string;
	durationSeconds: number | null;
	genre: string | null;
	imageUrl: string | null;
	/** The STABLE stream endpoint. Never a resolved, signed URL — those expire. */
	streamUrl: string;
	releaseDate: Date | null;
	/** null when the artist hid it via field_visibility. */
	playCount: number | null;
	/** The terms the artist chose. Travels with music that is not ours. */
	license: string | null;
	isrc: string | null;
}
```

- [ ] **Step 2: Capture the fixtures**

Capture from the live API rather than hand-writing, then trim to the fields the adapter reads:

```bash
mkdir -p src/lib/server/catalog-source/adapters/fixtures
curl -s "https://api.audius.co/v1/users/search?query=deadmau5&app_name=PDM" -o /tmp/u.json
curl -s "https://api.audius.co/v1/users/LKdlD?app_name=PDM"                 -o /tmp/one.json
curl -s "https://api.audius.co/v1/users/LKdlD/tracks?app_name=PDM"          -o /tmp/t.json
```

Keep the **real** CDN hostnames and the `mirrors` arrays — the adapter's types must match reality, and a later `Object.values()` over one of these image maps would otherwise hit an array. Each image object keeps its real shape:

```json
"cover_photo": {
	"640x": "https://audius-creator-3.theblueprint.xyz/content/QmRVVvqd2tAV.../640x.jpg",
	"2000x": "https://audius-creator-3.theblueprint.xyz/content/QmRVVvqd2tAV.../2000x.jpg",
	"mirrors": ["https://v.monophonic.digital"]
}
```

- `fixtures/users-search-deadmau5.json` — keep only the verified `LKdlD` and the unverified `deadmau54321`, both of which carry `"name": "deadmau5"`, so the impostor case is a permanent test rather than a memory. Give the second one `"profile_picture": null`, `"cover_photo": null`, `"erc_wallet": null`.
- `fixtures/user-LKdlD.json` — the single-object response, shaped `{ "data": { … } }`, **not** an array.
- `fixtures/user-tracks-LKdlD.json` — the one fully playable track (`7YmNr`), plus four hand-added rejects so every gate has a case: one with `"is_stream_gated": true`, one with `"is_unlisted": true`, one with `"is_delete": true`, and one with `"is_available": false` and `"access": {"stream": false}`.

- [ ] **Step 3: Write the failing test**

Create `src/lib/server/catalog-source/adapters/AudiusAdapter.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudiusAdapter } from './AudiusAdapter';
import users from './fixtures/users-search-deadmau5.json';
import oneUser from './fixtures/user-LKdlD.json';
import tracks from './fixtures/user-tracks-LKdlD.json';

function mockFetch(body: unknown, status = 200) {
	return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('AudiusAdapter.searchArtists', () => {
	beforeEach(() => vi.stubGlobal('fetch', mockFetch(users)));

	it('maps a user onto our shape without leaking Audius field names', async () => {
		const [first] = await AudiusAdapter.searchArtists('deadmau5');
		expect(first).toMatchObject({
			source: 'audius',
			externalId: 'LKdlD',
			handle: 'deadmau5',
			name: 'deadmau5',
			externalUrl: 'https://audius.co/deadmau5',
			isVerified: true,
			isDeactivated: false,
			walletAddress: '0x8aada2f1b43f4a36edea369dc01ed30abb9df9cd'
		});
	});

	it('picks the largest artwork and never the mirrors array', async () => {
		const [first] = await AudiusAdapter.searchArtists('deadmau5');
		expect(first.bannerUrl).toMatch(/2000x\.jpg$/);
		expect(first.avatarUrl).toMatch(/1000x1000\.jpg$/);
	});

	it('carries the social handles the artist published', async () => {
		const [first] = await AudiusAdapter.searchArtists('deadmau5');
		expect(first.socials).toEqual({ twitter: 'deadmau5', instagram: 'deadmau5' });
	});

	it('returns the impostor too, rather than silently picking a winner', async () => {
		const found = await AudiusAdapter.searchArtists('deadmau5');
		expect(found.map((a) => a.externalId)).toEqual(['LKdlD', 'D8OGl']);
	});

	it('survives a user with no pictures and no wallet', async () => {
		const found = await AudiusAdapter.searchArtists('deadmau5');
		expect(found[1]).toMatchObject({
			avatarUrl: null,
			bannerUrl: null,
			walletAddress: null,
			isVerified: false
		});
	});

	it('sends app_name so Audius can attribute the traffic', async () => {
		await AudiusAdapter.searchArtists('deadmau5');
		const url = String((globalThis.fetch as ReturnType<typeof mockFetch>).mock.calls[0][0]);
		expect(url).toContain('app_name=PDM');
	});

	it('raises a typed error when the source is unreachable', async () => {
		vi.stubGlobal('fetch', mockFetch('nope', 503));
		await expect(AudiusAdapter.searchArtists('deadmau5')).rejects.toThrow(
			'audius: users/search failed with 503'
		);
	});
});

describe('AudiusAdapter.getArtist', () => {
	it('reads a single-object response, not an array', async () => {
		vi.stubGlobal('fetch', mockFetch(oneUser));
		const found = await AudiusAdapter.getArtist('LKdlD');
		expect(found).toMatchObject({ externalId: 'LKdlD', handle: 'deadmau5' });
	});

	it('asks the id endpoint, never search — search does not match ids', async () => {
		vi.stubGlobal('fetch', mockFetch(oneUser));
		await AudiusAdapter.getArtist('LKdlD');
		const url = String((globalThis.fetch as ReturnType<typeof mockFetch>).mock.calls[0][0]);
		expect(url).toContain('/users/LKdlD');
		expect(url).not.toContain('search');
	});

	it('returns null for an unknown id rather than guessing', async () => {
		vi.stubGlobal('fetch', mockFetch({ data: null }, 404));
		await expect(AudiusAdapter.getArtist('NOPE')).resolves.toBeNull();
	});
});

describe('AudiusAdapter.listTracks', () => {
	beforeEach(() => vi.stubGlobal('fetch', mockFetch(tracks)));

	it('maps a playable track and stores the STABLE stream endpoint', async () => {
		const [first] = await AudiusAdapter.listTracks('LKdlD');
		expect(first).toEqual({
			source: 'audius',
			externalId: '7YmNr',
			title: 'deadmau5 - Nextra (Stem Drop)',
			durationSeconds: 61,
			genre: 'Electronic',
			imageUrl: expect.stringMatching(/1000x1000\.jpg$/),
			streamUrl: 'https://api.audius.co/v1/tracks/7YmNr/stream',
			releaseDate: new Date('2021-05-11T15:05:00Z'),
			playCount: 106778,
			license: 'All rights reserved',
			isrc: 'GBTDG1302232'
		});
	});

	it('never stores a signed URL, which would 403 the next day', async () => {
		const [first] = await AudiusAdapter.listTracks('LKdlD');
		expect(first.streamUrl).not.toContain('signature');
	});

	it('keeps only the one playable track from the fixture', async () => {
		const found = await AudiusAdapter.listTracks('LKdlD');
		expect(found.map((t) => t.externalId)).toEqual(['7YmNr']);
	});
});

describe('AudiusAdapter.toExternalTrack gates', () => {
	const playable = {
		id: 'X1',
		title: 'T',
		duration: 10,
		is_streamable: true,
		is_available: true,
		is_stream_gated: false,
		is_unlisted: false,
		is_delete: false,
		access: { stream: true }
	};

	it('accepts a track with every flag in the right state', () => {
		expect(AudiusAdapter.toExternalTrack(playable)).not.toBeNull();
	});

	it.each([
		['is_streamable false', { is_streamable: false }],
		['is_available false', { is_available: false }],
		['access.stream false', { access: { stream: false } }],
		['is_stream_gated true', { is_stream_gated: true }],
		['is_unlisted true', { is_unlisted: true }],
		['is_delete true', { is_delete: true }]
	])('rejects a track with %s', (_label, override) => {
		expect(AudiusAdapter.toExternalTrack({ ...playable, ...override })).toBeNull();
	});

	it('drops a play count the artist chose to hide', () => {
		const hidden = { ...playable, play_count: 5, field_visibility: { play_count: false } };
		expect(AudiusAdapter.toExternalTrack(hidden)?.playCount).toBeNull();
	});

	it('drops a genre the artist chose to hide', () => {
		const hidden = { ...playable, genre: 'Electronic', field_visibility: { genre: false } };
		expect(AudiusAdapter.toExternalTrack(hidden)?.genre).toBeNull();
	});

	it('tolerates every optional field being absent', () => {
		expect(AudiusAdapter.toExternalTrack(playable)).toMatchObject({
			genre: null,
			imageUrl: null,
			releaseDate: null,
			playCount: null,
			license: null,
			isrc: null
		});
	});
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `yarn test:unit --run src/lib/server/catalog-source/adapters/AudiusAdapter.spec.ts`
Expected: FAIL — `Failed to resolve import "./AudiusAdapter"`.

- [ ] **Step 5: Write the adapter**

Create `src/lib/server/catalog-source/adapters/AudiusAdapter.ts`:

```ts
import type { ExternalArtist, ExternalTrack } from '../types';

const BASE = 'https://api.audius.co/v1';
const APP_NAME = 'PDM';
const PROFILE_BASE = 'https://audius.co';

/**
 * The ONLY file that knows Audius field names. Everything it returns is our own
 * shape, so replacing this adapter — or adding a second source — touches nothing
 * else. Every endpoint here was verified against the live API on 2026-08-29.
 */
export class AudiusAdapter {
	static async searchArtists(query: string): Promise<ExternalArtist[]> {
		const raw = await get<{ data: AudiusUser[] }>(
			`/users/search?query=${encodeURIComponent(query)}`,
			'users/search'
		);
		return raw.data.map(toExternalArtist);
	}

	/**
	 * Resolve one artist by id. This MUST NOT go through search: Audius search matches
	 * names and handles, not ids — `?query=LKdlD` does not return LKdlD. Returns null
	 * rather than a best guess, because a wrong guess here seeds a page under one
	 * artist's name out of another account's uploads.
	 */
	static async getArtist(externalId: string): Promise<ExternalArtist | null> {
		const raw = await getOrNull<{ data: AudiusUser | null }>(
			`/users/${encodeURIComponent(externalId)}`,
			'users/get'
		);
		return raw?.data ? toExternalArtist(raw.data) : null;
	}

	static async listTracks(externalId: string): Promise<ExternalTrack[]> {
		const raw = await get<{ data: AudiusTrack[] }>(
			`/users/${encodeURIComponent(externalId)}/tracks`,
			'users/tracks'
		);
		return raw.data
			.map((t) => AudiusAdapter.toExternalTrack(t))
			.filter((t): t is ExternalTrack => t !== null);
	}

	/** The stable endpoint. It 302s to a signed URL at request time — never store that. */
	static streamUrlFor(externalId: string): string {
		return `${BASE}/tracks/${externalId}/stream`;
	}

	/**
	 * Returns null for any track we must not import. Six independent flags can make a
	 * track unplayable or private; a token-gated one would import cleanly and only fail
	 * when a listener pressed play, and an unlisted one was deliberately taken out of
	 * public view by its artist.
	 */
	static toExternalTrack(raw: AudiusTrack): ExternalTrack | null {
		const playable =
			raw.is_streamable === true &&
			raw.is_available === true &&
			raw.access?.stream === true &&
			raw.is_stream_gated !== true &&
			raw.is_unlisted !== true &&
			raw.is_delete !== true;
		if (!playable) return null;

		return {
			source: 'audius',
			externalId: raw.id,
			title: raw.title,
			durationSeconds: raw.duration ?? null,
			genre: raw.field_visibility?.genre === false ? null : (raw.genre ?? null),
			imageUrl: pick(raw.artwork, '1000x1000'),
			streamUrl: AudiusAdapter.streamUrlFor(raw.id),
			releaseDate: raw.release_date ? new Date(raw.release_date) : null,
			playCount: raw.field_visibility?.play_count === false ? null : (raw.play_count ?? null),
			license: raw.license ?? null,
			isrc: raw.isrc ?? null
		};
	}
}

function toExternalArtist(raw: AudiusUser): ExternalArtist {
	const socials: Record<string, string> = {};
	if (raw.twitter_handle) socials.twitter = raw.twitter_handle;
	if (raw.instagram_handle) socials.instagram = raw.instagram_handle;

	return {
		source: 'audius',
		externalId: raw.id,
		handle: raw.handle,
		name: raw.name,
		bio: raw.bio ?? null,
		avatarUrl: pick(raw.profile_picture, '1000x1000'),
		bannerUrl: pick(raw.cover_photo, '2000x'),
		externalUrl: `${PROFILE_BASE}/${raw.handle}`,
		socials,
		followerCount: raw.follower_count ?? 0,
		trackCount: raw.track_count ?? 0,
		isVerified: raw.is_verified === true,
		isDeactivated: raw.is_deactivated === true,
		walletAddress: raw.erc_wallet ?? null
	};
}

/**
 * Image maps carry a `mirrors: string[]` key alongside the size keys, so a size is
 * read by name and the value is type-checked before use.
 */
function pick(image: AudiusImage | null | undefined, size: string): string | null {
	const value = image?.[size];
	return typeof value === 'string' ? value : null;
}

async function get<T>(path: string, label: string): Promise<T> {
	const res = await fetch(url(path));
	if (!res.ok) throw new Error(`audius: ${label} failed with ${res.status}`);
	return (await res.json()) as T;
}

/** Like `get`, but a 404 means "no such artist", not an outage. */
async function getOrNull<T>(path: string, label: string): Promise<T | null> {
	const res = await fetch(url(path));
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`audius: ${label} failed with ${res.status}`);
	return (await res.json()) as T;
}

function url(path: string): string {
	return `${BASE}${path}${path.includes('?') ? '&' : '?'}app_name=${APP_NAME}`;
}

/** Size keys plus a `mirrors` array — hence the union value type. */
type AudiusImage = Record<string, string | string[] | undefined>;

// Only the fields we read. Audius returns far more; deliberately not modelled.
interface AudiusUser {
	id: string;
	handle: string;
	name: string;
	bio?: string | null;
	follower_count?: number;
	track_count?: number;
	is_verified?: boolean;
	is_deactivated?: boolean;
	erc_wallet?: string | null;
	twitter_handle?: string | null;
	instagram_handle?: string | null;
	profile_picture?: AudiusImage | null;
	cover_photo?: AudiusImage | null;
}

interface AudiusTrack {
	id: string;
	title: string;
	duration?: number | null;
	genre?: string | null;
	release_date?: string | null;
	play_count?: number | null;
	license?: string | null;
	isrc?: string | null;
	is_streamable?: boolean;
	is_available?: boolean;
	is_stream_gated?: boolean;
	is_unlisted?: boolean;
	is_delete?: boolean;
	access?: { stream?: boolean; download?: boolean };
	field_visibility?: Record<string, boolean>;
	artwork?: AudiusImage | null;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `yarn test:unit --run src/lib/server/catalog-source/adapters/AudiusAdapter.spec.ts`
Expected: PASS, 23 tests (the `it.each` block counts as 6).

- [ ] **Step 7: Commit**

```bash
yarn format
git add src/lib/server/catalog-source
git commit -m "feat(catalog-source): add Audius adapter with per-track import gates"
```

---

## Task 3: Idempotent, claim-safe repository

**Files:**

- Create: `src/lib/db/services/CatalogImportRepository.ts`
- Test: `src/lib/db/services/CatalogImportRepository.spec.ts`

**Interfaces:**

- Consumes: nothing from `$lib/server` — **deliberate**, see the layering constraint.
- Produces:
  - `interface ImportedArtistRow`, `interface ImportedTrackRow` (declared here, in the DB layer)
  - `CatalogImportRepository.upsertArtist(row: ImportedArtistRow): Promise<{ id: string } | null>`
  - `CatalogImportRepository.upsertTracks(artistId: string, rows: ImportedTrackRow[]): Promise<{ imported: number }>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/db/services/CatalogImportRepository.spec.ts`. The `vi.hoisted` wrapper is required — without it the factory reads the consts in TDZ and the file throws on load:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const m = vi.hoisted(() => {
	const returning = vi.fn(async () => [{ id: 'artist-1' }]);
	const onConflictDoUpdate = vi.fn(() => ({ returning }));
	const values = vi.fn(() => ({ onConflictDoUpdate }));
	const insert = vi.fn(() => ({ values }));
	return { returning, onConflictDoUpdate, values, insert };
});

vi.mock('$lib/db', () => ({
	db: { insert: m.insert },
	withDbLogging: vi.fn(async (_name: string, fn: () => unknown) => fn())
}));

import { CatalogImportRepository } from './CatalogImportRepository';
import type { ImportedArtistRow, ImportedTrackRow } from './CatalogImportRepository';

const artistRow: ImportedArtistRow = {
	name: 'deadmau5',
	slug: 'deadmau5',
	avatar: 'https://cdn.example/a.jpg',
	coverImg: 'https://cdn.example/b.jpg',
	description: 'cube v3',
	socialLinks: { twitter: 'deadmau5' },
	origin: 'audius',
	externalId: 'LKdlD',
	externalUrl: 'https://audius.co/deadmau5'
};

const trackRow: ImportedTrackRow = {
	title: 'Nextra',
	duration: 61,
	audioUrl: 'https://api.audius.co/v1/tracks/7YmNr/stream',
	imageUrl: 'https://cdn.example/t.jpg',
	genre: ['Electronic'],
	audioSource: 'audius',
	externalId: '7YmNr',
	metadata: { license: 'All rights reserved', isrc: 'GBTDG1302232' }
};

beforeEach(() => {
	vi.clearAllMocks();
	m.returning.mockResolvedValue([{ id: 'artist-1' }]);
});

describe('CatalogImportRepository.upsertArtist', () => {
	it('writes the artist with no owner and the source recorded', async () => {
		await CatalogImportRepository.upsertArtist(artistRow);
		expect(m.values).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: null,
				origin: 'audius',
				externalId: 'LKdlD',
				externalUrl: 'https://audius.co/deadmau5',
				slug: 'deadmau5'
			})
		);
	});

	it('imports hidden, so no page can go public before slice S2b', async () => {
		await CatalogImportRepository.upsertArtist(artistRow);
		expect(m.values).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
	});

	it('never sets claimedAt on import — that belongs to the claim flow', async () => {
		await CatalogImportRepository.upsertArtist(artistRow);
		expect(m.values.mock.calls[0][0]).not.toHaveProperty('claimedAt');
	});

	it('re-imports into the same row by keying on origin and external id', async () => {
		await CatalogImportRepository.upsertArtist(artistRow);
		const conflict = m.onConflictDoUpdate.mock.calls[0][0] as { target: unknown[] };
		expect(conflict.target).toHaveLength(2);
	});

	it('matches the partial index, or Postgres raises 42P10', async () => {
		await CatalogImportRepository.upsertArtist(artistRow);
		const conflict = m.onConflictDoUpdate.mock.calls[0][0] as { targetWhere: unknown };
		expect(conflict.targetWhere).toBeDefined();
	});

	it('refuses to overwrite a claimed page', async () => {
		await CatalogImportRepository.upsertArtist(artistRow);
		const conflict = m.onConflictDoUpdate.mock.calls[0][0] as { setWhere: unknown };
		expect(conflict.setWhere).toBeDefined();
	});

	it('refreshes mutable fields on re-import but never identity', async () => {
		await CatalogImportRepository.upsertArtist(artistRow);
		const conflict = m.onConflictDoUpdate.mock.calls[0][0] as { set: Record<string, unknown> };
		expect(Object.keys(conflict.set).sort()).toEqual(
			['avatar', 'coverImg', 'description', 'name', 'socialLinks', 'updatedAt'].sort()
		);
	});

	it('returns the row id so tracks can be parented', async () => {
		await expect(CatalogImportRepository.upsertArtist(artistRow)).resolves.toEqual({
			id: 'artist-1'
		});
	});

	it('returns null when setWhere suppressed the update on a claimed page', async () => {
		m.returning.mockResolvedValue([]);
		await expect(CatalogImportRepository.upsertArtist(artistRow)).resolves.toBeNull();
	});
});

describe('CatalogImportRepository.upsertTracks', () => {
	it('imports tracks unpublished, matching the hidden artist', async () => {
		await CatalogImportRepository.upsertTracks('artist-1', [trackRow]);
		expect(m.values).toHaveBeenCalledWith(
			expect.objectContaining({
				artistId: 'artist-1',
				audioSource: 'audius',
				externalId: '7YmNr',
				audioUrl: 'https://api.audius.co/v1/tracks/7YmNr/stream',
				status: 'ready',
				isPublished: false,
				visibility: 'public'
			})
		);
	});

	it('keeps the licence and ISRC with the music', async () => {
		await CatalogImportRepository.upsertTracks('artist-1', [trackRow]);
		const row = m.values.mock.calls[0][0] as { metadata: unknown };
		expect(row.metadata).toEqual({ license: 'All rights reserved', isrc: 'GBTDG1302232' });
	});

	it('matches the partial index, or Postgres raises 42P10', async () => {
		await CatalogImportRepository.upsertTracks('artist-1', [trackRow]);
		const conflict = m.onConflictDoUpdate.mock.calls[0][0] as { targetWhere: unknown };
		expect(conflict.targetWhere).toBeDefined();
	});

	it('updates from plain values, never a raw excluded reference', async () => {
		await CatalogImportRepository.upsertTracks('artist-1', [trackRow]);
		const conflict = m.onConflictDoUpdate.mock.calls[0][0] as { set: Record<string, unknown> };
		expect(conflict.set.title).toBe('Nextra');
	});

	it('writes one statement per track', async () => {
		await CatalogImportRepository.upsertTracks('artist-1', [
			trackRow,
			{ ...trackRow, externalId: 'B2' }
		]);
		expect(m.values).toHaveBeenCalledTimes(2);
	});

	it('reports how many rows it wrote', async () => {
		await expect(CatalogImportRepository.upsertTracks('artist-1', [trackRow])).resolves.toEqual({
			imported: 1
		});
	});

	it('does not touch the database for an empty list', async () => {
		const result = await CatalogImportRepository.upsertTracks('artist-1', []);
		expect(m.insert).not.toHaveBeenCalled();
		expect(result).toEqual({ imported: 0 });
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test:unit --run src/lib/db/services/CatalogImportRepository.spec.ts`
Expected: FAIL — `Failed to resolve import "./CatalogImportRepository"`.

- [ ] **Step 3: Write the repository**

Two things here are load-bearing and must not be "simplified" away.

**Hidden by default.** `isActive: false` / `isPublished: false` are not cosmetic. The app finds content by flags, not by imports: `getPopularTracks` (`queries.ts:443`) selects every `isPublished && status IN ('uploaded','ready')` track globally, `getActiveArtists` (`queries.ts:279`) returns every `isActive` artist, and `/artist/[slug]` loads purely by slug. Publishing on import would put a real person's name, photo and banner on a page that reads as their official PDM presence — with no "unofficial" notice (slice S2b) and no working audio (slice S2a). S2b flips these on together with the notice.

**`setWhere`.** Without it, re-importing an artist who has since claimed their page overwrites the name, bio and avatar they wrote themselves.

Create `src/lib/db/services/CatalogImportRepository.ts`:

```ts
import { isNull, ne } from 'drizzle-orm';
import { db, withDbLogging } from '$lib/db';
import { artists, tracks } from '$lib/db/schema';

/**
 * Plain row shapes owned by the DB layer. They deliberately do NOT reuse the
 * catalog-source DTOs: `src/lib/server/*` is layer 3 and this file is layer 4, and
 * layer 4 importing from layer 3 would make the Catalog seam un-extractable.
 */
export interface ImportedArtistRow {
	name: string;
	slug: string;
	avatar: string | null;
	coverImg: string | null;
	description: string | null;
	socialLinks: Record<string, string> | null;
	origin: string;
	externalId: string;
	externalUrl: string;
}

export interface ImportedTrackRow {
	title: string;
	duration: number | null;
	audioUrl: string;
	imageUrl: string | null;
	genre: string[] | null;
	audioSource: string;
	externalId: string;
	metadata: Record<string, unknown>;
}

/**
 * The only writer of imported catalog rows. Both methods are idempotent: re-running
 * an import updates the same rows rather than duplicating them, and neither ever
 * touches PDM-side data (chat, comments, likes, subscriptions).
 */
export class CatalogImportRepository {
	/** Returns null when the row exists but is claimed, so nothing was updated. */
	static async upsertArtist(row: ImportedArtistRow): Promise<{ id: string } | null> {
		return withDbLogging('CatalogImportRepository.upsertArtist', async () => {
			const written = await db
				.insert(artists)
				.values({
					userId: null,
					name: row.name,
					slug: row.slug,
					avatar: row.avatar,
					coverImg: row.coverImg,
					description: row.description,
					socialLinks: row.socialLinks,
					origin: row.origin,
					externalId: row.externalId,
					externalUrl: row.externalUrl,
					// Hidden until slice S2b ships the "unofficial page" notice.
					isActive: false
				})
				// `targetWhere` must repeat the partial index predicate from
				// schemas/artist.ts, or Postgres cannot infer the index and raises 42P10.
				// `ne`/`isNull` are safe here (unlike in the index definition): these run
				// inside a normal statement, so bind params bind.
				.onConflictDoUpdate({
					target: [artists.origin, artists.externalId],
					targetWhere: ne(artists.origin, 'native'),
					// Never overwrite a page whose artist has claimed and edited it.
					setWhere: isNull(artists.claimedAt),
					set: {
						name: row.name,
						avatar: row.avatar,
						coverImg: row.coverImg,
						description: row.description,
						socialLinks: row.socialLinks,
						updatedAt: new Date()
					}
				})
				.returning({ id: artists.id });
			return written[0] ? { id: written[0].id } : null;
		});
	}

	static async upsertTracks(
		artistId: string,
		rows: ImportedTrackRow[]
	): Promise<{ imported: number }> {
		if (rows.length === 0) return { imported: 0 };

		return withDbLogging('CatalogImportRepository.upsertTracks', async () => {
			// One statement per track rather than one multi-row insert. A multi-row upsert
			// would have to say `excluded.*` to give each conflicting row its own new value,
			// and Drizzle 0.45 ships no typed helper for that — it would mean hand-written
			// SQL column names no compiler checks. Import is an admin batch over tens of
			// tracks, so N statements is a fair price for zero raw SQL.
			for (const row of rows) {
				await db
					.insert(tracks)
					.values({
						artistId,
						title: row.title,
						duration: row.duration,
						audioUrl: row.audioUrl,
						imageUrl: row.imageUrl,
						genre: row.genre,
						audioSource: row.audioSource,
						externalId: row.externalId,
						// Imported audio skips the R2 upload lifecycle: it is already live.
						status: 'ready',
						// Hidden until slice S2b, same reason as the artist above.
						isPublished: false,
						visibility: 'public',
						metadata: row.metadata
					})
					.onConflictDoUpdate({
						target: [tracks.audioSource, tracks.externalId],
						targetWhere: ne(tracks.audioSource, 'r2'),
						set: {
							title: row.title,
							duration: row.duration,
							audioUrl: row.audioUrl,
							imageUrl: row.imageUrl,
							updatedAt: new Date()
						}
					});
			}
			return { imported: rows.length };
		});
	}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test:unit --run src/lib/db/services/CatalogImportRepository.spec.ts`
Expected: PASS, 16 tests.

- [ ] **Step 5: Commit**

```bash
yarn format
yarn run check
git add src/lib/db/services/CatalogImportRepository.ts src/lib/db/services/CatalogImportRepository.spec.ts
git commit -m "feat(db): idempotent, claim-safe upserts for imported catalog"
```

---

## Task 4: CatalogSourceService

**Files:**

- Create: `src/lib/server/catalog-source/CatalogSourceService.ts`
- Create: `src/lib/server/catalog-source/index.ts`
- Test: `src/lib/server/catalog-source/CatalogSourceService.spec.ts`

**Interfaces:**

- Consumes: `AudiusAdapter.searchArtists` / `.getArtist` / `.listTracks` (Task 2); `CatalogImportRepository.upsertArtist` / `.upsertTracks` and the `ImportedArtistRow` / `ImportedTrackRow` shapes (Task 3); `ArtistService.getArtistBySlug` (`src/lib/db/queries.ts:253`); `logger` (`src/lib/utils/logger.ts`).
- Produces:
  - `CatalogSourceService.lookupArtist(query: string): Promise<ArtistCandidate[]>`
  - `CatalogSourceService.importArtist(externalId: string, opts?: { allowUnverified?: boolean }): Promise<ImportResult>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/server/catalog-source/CatalogSourceService.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./adapters/AudiusAdapter', () => ({
	AudiusAdapter: { searchArtists: vi.fn(), getArtist: vi.fn(), listTracks: vi.fn() }
}));
vi.mock('$lib/db/services/CatalogImportRepository', () => ({
	CatalogImportRepository: { upsertArtist: vi.fn(), upsertTracks: vi.fn() }
}));
vi.mock('$lib/db/queries', () => ({ ArtistService: { getArtistBySlug: vi.fn() } }));
vi.mock('$lib/utils/logger', () => ({ logger: { warn: vi.fn(), info: vi.fn() } }));

import { AudiusAdapter } from './adapters/AudiusAdapter';
import { CatalogImportRepository } from '$lib/db/services/CatalogImportRepository';
import { ArtistService } from '$lib/db/queries';
import { logger } from '$lib/utils/logger';
import { CatalogSourceService } from './CatalogSourceService';
import type { ExternalArtist, ExternalTrack } from './types';

const verified: ExternalArtist = {
	source: 'audius',
	externalId: 'LKdlD',
	handle: 'deadmau5',
	name: 'deadmau5',
	bio: 'cube v3',
	avatarUrl: 'https://cdn.example/a.jpg',
	bannerUrl: 'https://cdn.example/b.jpg',
	externalUrl: 'https://audius.co/deadmau5',
	socials: { twitter: 'deadmau5' },
	followerCount: 94917,
	trackCount: 9,
	isVerified: true,
	isDeactivated: false,
	walletAddress: '0xabc'
};

const impostor: ExternalArtist = {
	...verified,
	externalId: 'D8OGl',
	handle: 'deadmau54321',
	followerCount: 704,
	isVerified: false,
	walletAddress: null
};

const track: ExternalTrack = {
	source: 'audius',
	externalId: '7YmNr',
	title: 'Nextra',
	durationSeconds: 61,
	genre: 'Electronic',
	imageUrl: null,
	streamUrl: 'https://api.audius.co/v1/tracks/7YmNr/stream',
	releaseDate: null,
	playCount: 1,
	license: null,
	isrc: null
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(CatalogImportRepository.upsertArtist).mockResolvedValue({ id: 'artist-1' });
	vi.mocked(CatalogImportRepository.upsertTracks).mockResolvedValue({ imported: 1 });
	vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue(undefined);
	vi.mocked(AudiusAdapter.getArtist).mockResolvedValue(verified);
	vi.mocked(AudiusAdapter.listTracks).mockResolvedValue([track]);
});

describe('CatalogSourceService.lookupArtist', () => {
	it('returns every candidate so a human decides, never picking one', async () => {
		vi.mocked(AudiusAdapter.searchArtists).mockResolvedValue([verified, impostor]);
		const found = await CatalogSourceService.lookupArtist('deadmau5');
		expect(found.map((c) => c.externalId)).toEqual(['LKdlD', 'D8OGl']);
	});

	it('surfaces the signals a human needs to tell them apart', async () => {
		vi.mocked(AudiusAdapter.searchArtists).mockResolvedValue([verified]);
		const [first] = await CatalogSourceService.lookupArtist('deadmau5');
		expect(first).toEqual({
			externalId: 'LKdlD',
			handle: 'deadmau5',
			name: 'deadmau5',
			followerCount: 94917,
			trackCount: 9,
			isVerified: true,
			externalUrl: 'https://audius.co/deadmau5'
		});
	});

	it('writes nothing — lookup is read-only', async () => {
		vi.mocked(AudiusAdapter.searchArtists).mockResolvedValue([verified]);
		await CatalogSourceService.lookupArtist('deadmau5');
		expect(CatalogImportRepository.upsertArtist).not.toHaveBeenCalled();
	});
});

describe('CatalogSourceService.importArtist resolution', () => {
	it('resolves the id through the id endpoint, never through search', async () => {
		await CatalogSourceService.importArtist('LKdlD');
		expect(AudiusAdapter.getArtist).toHaveBeenCalledWith('LKdlD');
		expect(AudiusAdapter.searchArtists).not.toHaveBeenCalled();
	});

	it('refuses an id the source does not know, rather than guessing', async () => {
		vi.mocked(AudiusAdapter.getArtist).mockResolvedValue(null);
		await expect(CatalogSourceService.importArtist('NOPE')).resolves.toEqual({
			ok: false,
			reason: 'not_found'
		});
	});
});

describe('CatalogSourceService.importArtist gates', () => {
	it('refuses an unverified artist by default', async () => {
		vi.mocked(AudiusAdapter.getArtist).mockResolvedValue(impostor);
		await expect(CatalogSourceService.importArtist('D8OGl')).resolves.toEqual({
			ok: false,
			reason: 'unverified'
		});
	});

	it('imports an unverified artist when an admin overrides on purpose', async () => {
		vi.mocked(AudiusAdapter.getArtist).mockResolvedValue(impostor);
		const result = await CatalogSourceService.importArtist('D8OGl', { allowUnverified: true });
		expect(result).toMatchObject({ ok: true });
	});

	it('logs the override, because it weakens the impostor defence', async () => {
		vi.mocked(AudiusAdapter.getArtist).mockResolvedValue(impostor);
		await CatalogSourceService.importArtist('D8OGl', { allowUnverified: true });
		expect(logger.warn).toHaveBeenCalled();
	});

	it('refuses a deactivated account', async () => {
		vi.mocked(AudiusAdapter.getArtist).mockResolvedValue({ ...verified, isDeactivated: true });
		await expect(CatalogSourceService.importArtist('LKdlD')).resolves.toEqual({
			ok: false,
			reason: 'deactivated'
		});
	});

	it('refuses an artist whose tracks are all unplayable', async () => {
		vi.mocked(AudiusAdapter.listTracks).mockResolvedValue([]);
		await expect(CatalogSourceService.importArtist('LKdlD')).resolves.toEqual({
			ok: false,
			reason: 'no_tracks'
		});
	});

	it('refuses when the slug is already taken by a different artist', async () => {
		vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue({
			id: 'other',
			origin: 'native',
			externalId: null
		} as never);
		await expect(CatalogSourceService.importArtist('LKdlD')).resolves.toEqual({
			ok: false,
			reason: 'slug_taken'
		});
	});

	it('allows re-import when the slug belongs to this same source artist', async () => {
		vi.mocked(ArtistService.getArtistBySlug).mockResolvedValue({
			id: 'artist-1',
			origin: 'audius',
			externalId: 'LKdlD'
		} as never);
		await expect(CatalogSourceService.importArtist('LKdlD')).resolves.toMatchObject({ ok: true });
	});

	it('refuses to re-import a page the artist has already claimed', async () => {
		vi.mocked(CatalogImportRepository.upsertArtist).mockResolvedValue(null);
		await expect(CatalogSourceService.importArtist('LKdlD')).resolves.toEqual({
			ok: false,
			reason: 'already_claimed'
		});
	});

	it('writes nothing when a gate refuses', async () => {
		vi.mocked(AudiusAdapter.getArtist).mockResolvedValue(impostor);
		await CatalogSourceService.importArtist('D8OGl');
		expect(CatalogImportRepository.upsertArtist).not.toHaveBeenCalled();
		expect(CatalogImportRepository.upsertTracks).not.toHaveBeenCalled();
	});
});

describe('CatalogSourceService.importArtist success path', () => {
	it('derives a stable slug from the source handle', async () => {
		await CatalogSourceService.importArtist('LKdlD');
		expect(CatalogImportRepository.upsertArtist).toHaveBeenCalledWith(
			expect.objectContaining({ slug: 'deadmau5', origin: 'audius', externalId: 'LKdlD' })
		);
	});

	it('maps the DTO onto a plain row — no DTO reaches the DB layer', async () => {
		await CatalogSourceService.importArtist('LKdlD');
		const row = vi.mocked(CatalogImportRepository.upsertArtist).mock.calls[0][0];
		expect(row).not.toHaveProperty('source');
		expect(row).toMatchObject({ socialLinks: { twitter: 'deadmau5' } });
	});

	it('parents the tracks to the row the repository returned', async () => {
		await CatalogSourceService.importArtist('LKdlD');
		expect(CatalogImportRepository.upsertTracks).toHaveBeenCalledWith('artist-1', [
			expect.objectContaining({ externalId: '7YmNr', audioSource: 'audius' })
		]);
	});

	it('reports what it wrote', async () => {
		await expect(CatalogSourceService.importArtist('LKdlD')).resolves.toEqual({
			ok: true,
			artistId: 'artist-1',
			slug: 'deadmau5',
			tracksImported: 1
		});
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test:unit --run src/lib/server/catalog-source/CatalogSourceService.spec.ts`
Expected: FAIL — `Failed to resolve import "./CatalogSourceService"`.

- [ ] **Step 3: Write the service**

Create `src/lib/server/catalog-source/CatalogSourceService.ts`:

```ts
import { AudiusAdapter } from './adapters/AudiusAdapter';
import {
	CatalogImportRepository,
	type ImportedArtistRow,
	type ImportedTrackRow
} from '$lib/db/services/CatalogImportRepository';
import { ArtistService } from '$lib/db/queries';
import { logger } from '$lib/utils/logger';
import type { ExternalArtist, ExternalTrack } from './types';

/** What a human needs in order to tell a real artist from a same-named impostor. */
export interface ArtistCandidate {
	externalId: string;
	handle: string;
	name: string;
	followerCount: number;
	trackCount: number;
	isVerified: boolean;
	externalUrl: string;
}

export type ImportRefusal =
	| 'not_found'
	| 'unverified'
	| 'deactivated'
	| 'no_tracks'
	| 'slug_taken'
	| 'already_claimed';

export type ImportResult =
	| { ok: true; artistId: string; slug: string; tracksImported: number }
	| { ok: false; reason: ImportRefusal };

/**
 * Application boundary for importing catalog from an external source. Returns only
 * primitives — no Drizzle row and no adapter type crosses this seam, so the
 * in-process implementation can become a remote Catalog client later.
 *
 * `lookupArtist` is deliberately separate from `importArtist`, and `importArtist`
 * takes an id resolved through the source's id endpoint: a search for a well-known
 * name returns several accounts using it, and picking one automatically would
 * eventually seed a page under a real artist's name from an impostor's uploads.
 */
export class CatalogSourceService {
	static async lookupArtist(query: string): Promise<ArtistCandidate[]> {
		const found = await AudiusAdapter.searchArtists(query);
		return found.map(toCandidate);
	}

	static async importArtist(
		externalId: string,
		opts: { allowUnverified?: boolean } = {}
	): Promise<ImportResult> {
		const artist = await AudiusAdapter.getArtist(externalId);
		if (!artist) return { ok: false, reason: 'not_found' };
		if (artist.isDeactivated) return { ok: false, reason: 'deactivated' };

		if (!artist.isVerified) {
			if (!opts.allowUnverified) return { ok: false, reason: 'unverified' };
			logger.warn('Importing an unverified artist by explicit override', {
				component: 'catalog-source',
				metadata: { externalId, handle: artist.handle, source: artist.source }
			});
		}

		// Gate on what is actually playable, not the source's own track_count: gated,
		// unlisted and deleted tracks are filtered out by the adapter.
		const tracks = await AudiusAdapter.listTracks(artist.externalId);
		if (tracks.length === 0) return { ok: false, reason: 'no_tracks' };

		// `artists.slug` is globally unique, so a handle colliding with an existing PDM
		// artist would otherwise surface as an unhandled unique_violation on first import.
		const slug = artist.handle.toLowerCase();
		const existing = await ArtistService.getArtistBySlug(slug);
		const sameArtist =
			existing?.origin === artist.source && existing?.externalId === artist.externalId;
		if (existing && !sameArtist) return { ok: false, reason: 'slug_taken' };

		const written = await CatalogImportRepository.upsertArtist(toArtistRow(artist, slug));
		// null means the row exists but is claimed, so `setWhere` suppressed the update.
		if (!written) return { ok: false, reason: 'already_claimed' };

		const { imported } = await CatalogImportRepository.upsertTracks(
			written.id,
			tracks.map(toTrackRow)
		);

		return { ok: true, artistId: written.id, slug, tracksImported: imported };
	}
}

function toCandidate(a: ExternalArtist): ArtistCandidate {
	return {
		externalId: a.externalId,
		handle: a.handle,
		name: a.name,
		followerCount: a.followerCount,
		trackCount: a.trackCount,
		isVerified: a.isVerified,
		externalUrl: a.externalUrl
	};
}

/** DTO → plain row. Mapping lives here so the DB layer never imports from `$lib/server`. */
function toArtistRow(a: ExternalArtist, slug: string): ImportedArtistRow {
	return {
		name: a.name,
		slug,
		avatar: a.avatarUrl,
		coverImg: a.bannerUrl,
		description: a.bio,
		socialLinks: Object.keys(a.socials).length > 0 ? a.socials : null,
		origin: a.source,
		externalId: a.externalId,
		externalUrl: a.externalUrl
	};
}

function toTrackRow(t: ExternalTrack): ImportedTrackRow {
	return {
		title: t.title,
		duration: t.durationSeconds,
		audioUrl: t.streamUrl,
		imageUrl: t.imageUrl,
		genre: t.genre ? [t.genre] : null,
		audioSource: t.source,
		externalId: t.externalId,
		metadata: { license: t.license, isrc: t.isrc }
	};
}
```

- [ ] **Step 4: Write the barrel**

Create `src/lib/server/catalog-source/index.ts`:

```ts
export { CatalogSourceService } from './CatalogSourceService';
export type { ArtistCandidate, ImportResult, ImportRefusal } from './CatalogSourceService';
export type { CatalogSource, ExternalArtist, ExternalTrack } from './types';
```

`AudiusAdapter` is deliberately **not** exported — nothing outside the boundary may reach a source directly.

- [ ] **Step 5: Run the test to verify it passes**

Run: `yarn test:unit --run src/lib/server/catalog-source/CatalogSourceService.spec.ts`
Expected: PASS, 18 tests.

- [ ] **Step 6: Commit**

```bash
yarn format
yarn run check
git add src/lib/server/catalog-source
git commit -m "feat(catalog-source): gate and orchestrate artist import"
```

---

## Task 5: Admin entrypoint, coverage, and a safe smoke test

**Files:**

- Create: `scripts/import-artist.ts`
- Modify: `vite.config.ts` (`test.coverage.include`)
- Modify: `package.json` (`import:artist` script, `vite-node` devDependency)

**Interfaces:**

- Consumes: `CatalogSourceService` from `$lib/server/catalog-source`.
- Produces: `yarn import:artist --search "<name>"` and `yarn import:artist --id <externalId> [--allow-unverified]`.

- [ ] **Step 1: Write the script**

Create `scripts/import-artist.ts`:

```ts
/**
 * Admin entrypoint for seeding an artist. Two steps on purpose: search first, read the
 * candidates, then import the id you chose. There is no "import the top hit" path,
 * because a search for a well-known name returns several accounts using it.
 *
 *   yarn import:artist --search "deadmau5"
 *   yarn import:artist --id LKdlD
 *   yarn import:artist --id D8OGl --allow-unverified
 *
 * Imported rows are hidden (`is_active = false`, `is_published = false`) until slice
 * S2b ships the "unofficial page" notice, so running this cannot publish anything.
 */
import 'dotenv/config';
import { CatalogSourceService } from '../src/lib/server/catalog-source';

const REFUSAL_HELP: Record<string, string> = {
	not_found: 'No artist with that id. Run --search first and copy an externalId.',
	unverified: 'Not verified on the source. Re-run with --allow-unverified if deliberate.',
	deactivated: 'That account is deactivated on the source.',
	no_tracks: 'No playable tracks — all are gated, unlisted, deleted or unavailable.',
	slug_taken: 'A different PDM artist already owns that slug.',
	already_claimed: 'That page has been claimed; import must not overwrite the artist.'
};

function arg(name: string): string | undefined {
	const i = process.argv.indexOf(`--${name}`);
	return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
	const search = arg('search');
	const id = arg('id');
	const allowUnverified = process.argv.includes('--allow-unverified');

	if (search) {
		const candidates = await CatalogSourceService.lookupArtist(search);
		if (candidates.length === 0) {
			console.log('No candidates.');
			return;
		}
		console.table(candidates);
		console.log('\nPick one and run:  yarn import:artist --id <externalId>');
		return;
	}

	if (!id) {
		console.error('Usage: --search "<name>"  |  --id <externalId> [--allow-unverified]');
		process.exitCode = 1;
		return;
	}

	const result = await CatalogSourceService.importArtist(id, { allowUnverified });
	if (!result.ok) {
		console.error(`Refused: ${result.reason} — ${REFUSAL_HELP[result.reason] ?? ''}`);
		process.exitCode = 1;
		return;
	}
	console.log(
		`Imported ${result.slug} (artist ${result.artistId}) with ${result.tracksImported} tracks, hidden.`
	);
}

main().then(
	() => process.exit(process.exitCode ?? 0),
	(err) => {
		console.error(err);
		process.exit(1);
	}
);
```

- [ ] **Step 2: Register the script and declare its runner**

In `package.json` `"scripts"`, add:

```json
		"import:artist": "vite-node scripts/import-artist.ts"
```

`vite-node` is currently present only transitively via vitest. Declare it so a vitest bump cannot remove it:

```bash
yarn add -D vite-node
```

It is used rather than `node` or `tsx` because the script resolves `$lib` and, through `$lib/db` → `$lib/utils/logger`, the SvelteKit-only `$app/environment` alias.

**This does fail** — confirmed during execution. The `sveltekit()` plugin throws
`Error: An impossible situation occurred` when asked to resolve `$app/*` outside a real build, and
once that is stubbed, `$env/static/private` is missing too (it is generated by the same plugin, and
`$lib/db/queries` pulls in `R2Service`, which imports from it).

So the script runs through its own config:

```json
"import:artist": "vite-node -c vite.config.script.ts scripts/import-artist.ts"
```

`vite.config.script.ts` skips the `sveltekit()` plugin and aliases two stubs:
`scripts/app-environment.stub.ts` (exports `dev`, the only thing `src/lib/utils/logger.ts` needs)
and `scripts/env-static-private.stub.ts` (forwards the four R2 names from `process.env`, which
`dotenv/config` has already populated — nothing hardcoded, no secret stored).

Note: `scripts/` is outside `tsconfig`'s `include` (`../src/**/*.ts`), so `yarn check` never typechecks this file. Read it carefully.

- [ ] **Step 3: Add the new code to coverage**

In `vite.config.ts`, inside `test.coverage.include`, add alongside the existing entries:

```ts
				'src/lib/server/catalog-source/**',
				'src/lib/db/services/CatalogImportRepository.ts',
```

`**/index.ts` and `**/types.ts` are already excluded globally, so the barrel and the DTO file are not counted.

- [ ] **Step 4: Verify the slice**

```bash
yarn test:unit --run src/lib/server/catalog-source src/lib/db/services/CatalogImportRepository.spec.ts src/lib/db/schemas/external-origin.spec.ts
```

Expected: PASS, **64 tests** (7 + 23 + 16 + 18).

Coverage is a **separate** command — `yarn test:unit --run <paths>` measures nothing:

```bash
yarn test:coverage
```

Expected: the new code passes comfortably — `src/lib/server/catalog-source` at 100% lines /
91.3% branches, `AudiusAdapter.ts` at 100% / 92.45%, against a 90% bar.

**The command still exits non-zero, and that is pre-existing.** `src/lib/server/chat/**` carries its
own 100% threshold and sits at 99.58% lines / 94.31% branches, uncovered at `asyncQueue.ts:51` and
`listener.ts:64-67`. CI never noticed because it runs `yarn test:unit -- --run --project server`
with no `--coverage` at all. Do not fix it here — it is untouched by this slice.

```bash
yarn run check   # expected: 0 errors
yarn lint    # expected: clean
```

- [ ] **Step 5: Smoke-test against the live API, on the throwaway database**

**Do not run the import against the shared dev database.** This repo already has an ephemeral one: `e2e/setup-test-db.mjs` creates `pdm_e2e` (derived from `DIRECT_DATABASE_URL` by swapping the database name) and `e2e/global-teardown.ts` drops it. Reuse it.

```bash
node e2e/setup-test-db.mjs
```

Point `DATABASE_URL` at `pdm_e2e` for these invocations only. On PowerShell:

```powershell
$env:DATABASE_URL = (node -e "import('./e2e/test-db.mjs').then(m=>console.log(m.TEST_DATABASE_URL))")
yarn import:artist --search "deadmau5"
yarn import:artist --id LKdlD
yarn import:artist --id LKdlD          # second run — the idempotency proof
Remove-Item Env:DATABASE_URL
```

Expected:

1. `--search` prints a table with at least two rows; the verified one shows `isVerified: true`. **Copy the `externalId` from that table — do not assume it.**
2. The first `--id` prints `Imported deadmau5 (artist <uuid>) with N tracks, hidden.`
3. The second prints the **same** artist uuid and the **same** track count. That is idempotency proven against a real database rather than a mock.

Then drop the throwaway database. If no script path works, do it by hand:

```sql
DROP DATABASE pdm_e2e WITH (FORCE);
```

- [ ] **Step 6: Commit**

```bash
yarn format
git add scripts/import-artist.ts vite.config.ts package.json yarn.lock
git commit -m "feat(catalog-source): admin import script and coverage"
```

---

## Done when

- `yarn test:unit --run` (64 new tests), `yarn test:coverage`, `yarn check` and `yarn lint` all pass.
- `yarn import:artist --id <id>` run twice against `pdm_e2e` produces one artist row and one set of tracks, and the throwaway database is dropped afterwards.
- **Every imported row is hidden**: `artists.is_active = false`, `tracks.is_published = false`. Nothing a visitor can reach changed in this slice.
- The shared dev database contains no imported rows.

## What v1 got wrong

An independent review of the first draft found six real defects. They are recorded here so a reader who wonders why a step looks over-careful does not simplify the fix away.

1. **`importArtist` would have imported the wrong artist.** v1 resolved an id by calling `searchArtists(externalId)` and falling back to `found[0]`. Audius search does not match ids — `?query=LKdlD` does not return LKdlD — and `GET /v1/users/{id}`, which v1 claimed did not exist, returns 200 with a single object. The fallback re-introduced the exact impostor bug the two-step design exists to prevent, and every unit test passed anyway because the adapter was mocked.
2. **Re-import would have destroyed a claimed artist's own edits.** `set` overwrote name, bio and avatar unconditionally. Now `setWhere: isNull(artists.claimedAt)` guards it and the service reports `already_claimed`.
3. **"S1 is invisible to users" was false.** The app finds content by flags, not by imports, so publishing on import would have put a real person's page live with no "unofficial" notice and no working audio. Hence hidden-by-default plus a smoke test on the throwaway database.
4. **`upsertTracks` omitted `targetWhere`** against a partial index — every real track write would have raised `42P10`.
5. **The repository spec would have crashed on load** — a `vi.mock` factory reading module-level consts in TDZ.
6. **Slug collision was unhandled** and would have surfaced as an unhandled `unique_violation` on first import of a colliding handle.

Also corrected: the DB layer no longer imports from `$lib/server` (a layering inversion against `.claude/wiki/architecture/service-boundaries.md`); the "verify coverage" step now actually measures coverage; the unverified override is logged as the spec requires; social handles are mapped; and the migration-review step no longer tells a literal executor to stop on `--> statement-breakpoint` separators.
