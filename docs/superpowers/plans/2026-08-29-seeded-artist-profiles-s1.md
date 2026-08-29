# Seeded Artist Profiles — Slice S1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import unclaimed artist profiles and their tracks from Audius into PDM's own tables, idempotently and behind a service boundary — with no UI.

**Architecture:** A new application-service boundary at `src/lib/server/catalog-source/` owns the outside world. `AudiusAdapter` turns HTTP responses into our own `ExternalArtist` / `ExternalTrack` DTOs; `CatalogSourceService` applies the import gates and orchestrates; a new `SeededCatalogRepository` in the DB layer performs idempotent upserts keyed on `(origin, external_id)`. No Audius response type and no Drizzle row crosses the service boundary in either direction. Seeded artists reuse the existing `artist.artists` table behind an `origin` discriminator, so every existing FK, query and page keeps working.

**Tech Stack:** SvelteKit 2 · TypeScript · Drizzle ORM + Postgres (`postgres-js`) · Vitest (node project) · yarn

**Spec:** `docs/superpowers/specs/2026-08-29-seeded-artist-profiles-design.md`

## Global Constraints

- Package manager is **yarn**. Never `npm`.
- Indentation is **tabs** (`.prettierrc`). Run `yarn format` before committing.
- Run `yarn check` (svelte-kit sync + svelte-check) after changes; it must pass.
- Vitest runs with `expect: { requireAssertions: true }` — **every** test must assert.
- Migration flow is: edit the domain schema file → update `src/lib/db/schema.ts` → `yarn db:generate` → **read the generated SQL** → `yarn db:migrate`. **Never `yarn db:push`** against the shared dev DB.
- `vi.mock()` is hoisted and module-scoped: one factory per module per file. If two test groups need different mock shapes for the same module, they go in different spec files (this is why `MusicApplicationService` has seven).
- Audius base host is `https://api.audius.co/v1`. Send `app_name=PDM` on every request (optional to the API, expected by convention). No API key, no auth.
- **No Audius response types and no Drizzle rows cross `src/lib/server/catalog-source/`.** The adapter returns our DTOs; the service returns primitives.
- `tracks.audioUrl` for an Audius track stores the **stable** endpoint `https://api.audius.co/v1/tracks/{externalId}/stream`. Never store the URL it redirects to — that one is signed with a timestamp and expires.
- Wrap notable DB operations in `withDbLogging(name, fn)` from `src/lib/db/index.ts`.
- No UI in this slice. No route touches this code yet.

---

## File Structure

| File                                                           | Responsibility                                                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/lib/db/schemas/artist.ts`                                 | **Modify.** `userId` nullable; add `origin`, `externalId`, `externalUrl`, `claimedAt`; partial unique index |
| `src/lib/db/schemas/catalog.ts`                                | **Modify.** `tracks` gains `audioSource`, `externalId`                                                      |
| `src/lib/db/schemas/finance.ts`                                | **Modify.** `subscriptions` gains `kind`                                                                    |
| `src/lib/db/schema.seeded.spec.ts`                             | **Create.** Asserts the column shape so a domain-file edit can't drift from intent                          |
| `drizzle/migrations/<generated>.sql`                           | **Create** via `yarn db:generate`                                                                           |
| `src/lib/server/catalog-source/types.ts`                       | **Create.** `ExternalArtist`, `ExternalTrack`, `CatalogSource`                                              |
| `src/lib/server/catalog-source/adapters/AudiusAdapter.ts`      | **Create.** HTTP + mapping. The only file that knows Audius field names                                     |
| `src/lib/server/catalog-source/adapters/fixtures/`             | **Create.** Real captured responses                                                                         |
| `src/lib/server/catalog-source/adapters/AudiusAdapter.spec.ts` | **Create.** Mapping + gate tests against fixtures, no network                                               |
| `src/lib/db/services/SeededCatalogRepository.ts`               | **Create.** Idempotent upserts. The only file that writes seeded rows                                       |
| `src/lib/db/services/SeededCatalogRepository.spec.ts`          | **Create.**                                                                                                 |
| `src/lib/server/catalog-source/CatalogSourceService.ts`        | **Create.** Gates + orchestration. Returns primitives                                                       |
| `src/lib/server/catalog-source/CatalogSourceService.spec.ts`   | **Create.**                                                                                                 |
| `src/lib/server/catalog-source/index.ts`                       | **Create.** Barrel — the only import path for consumers                                                     |
| `scripts/import-artist.ts`                                     | **Create.** Admin entrypoint                                                                                |
| `vite.config.ts`                                               | **Modify.** Add the new paths to the coverage `include` list                                                |

---

## Task 1: Schema and migration

**Files:**

- Modify: `src/lib/db/schemas/artist.ts`
- Modify: `src/lib/db/schemas/catalog.ts:41-70` (the `tracks` table)
- Modify: `src/lib/db/schemas/finance.ts:20-38` (the `subscriptions` table)
- Test: `src/lib/db/schema.seeded.spec.ts`
- Create: `drizzle/migrations/<generated>.sql`

**Interfaces:**

- Consumes: nothing.
- Produces: columns `artists.origin`, `artists.externalId`, `artists.externalUrl`, `artists.claimedAt`, nullable `artists.userId`; `tracks.audioSource`, `tracks.externalId`; `subscriptions.kind`. Types `Artist` / `NewArtist` / `Track` / `NewTrack` (already exported from `src/lib/db/schema.ts` and `src/lib/db/index.ts`) widen automatically.

- [ ] **Step 1: Write the failing test**

Create `src/lib/db/schema.seeded.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { artists } from './schemas/artist';
import { tracks } from './schemas/catalog';
import { subscriptions } from './schemas/finance';

describe('seeded-artist schema', () => {
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

Run: `yarn test:unit -- --run src/lib/db/schema.seeded.spec.ts`
Expected: FAIL — `artists.origin` is undefined, so reading `.notNull` throws `TypeError: Cannot read properties of undefined`.

- [ ] **Step 3: Add the columns to `schemas/artist.ts`**

Replace the import line and the `artists` table. Note `uniqueIndex` and `sql` are new imports:

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
		// NULL means unclaimed. Also the cutoff a "was here first" badge is derived from.
		claimedAt: timestamp('claimed_at'),
		trust_score: decimal('trust_score', { precision: 3, scale: 2 }).default('3.00').notNull(),
		isActive: boolean('is_active').default(true),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(t) => [
		// Partial: native artists have no external id, and many NULLs would collide.
		// The predicate must be repeated verbatim in every ON CONFLICT that targets it.
		uniqueIndex('artists_origin_external_unique')
			.on(t.origin, t.externalId)
			.where(sql`${t.origin} <> 'native'`)
	]
);
```

Leave `artistOnboardingRequests`, `artistAccounts` and `artistSessions` in the file untouched.

- [ ] **Step 4: Add the columns to `schemas/catalog.ts`**

Inside the `tracks` table definition, directly after the existing `status` line, add:

```ts
		// 'r2' = we host the audio. 'audius' = audioUrl is the stable /stream endpoint.
		audioSource: varchar('audio_source', { length: 16 }).default('r2').notNull(),
		externalId: varchar('external_id', { length: 64 }),
```

- [ ] **Step 5: Add the column to `schemas/finance.ts`**

Inside the `subscriptions` table definition, directly after the existing `status` line, add:

```ts
		// 'pre_claim_free' rows carry no payment — they must never reach revenue reporting.
		kind: varchar('kind', { length: 16 }).default('paid').notNull(),
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `yarn test:unit -- --run src/lib/db/schema.seeded.spec.ts`
Expected: PASS, 7 tests.

- [ ] **Step 7: Confirm the aggregator needs no edit, then typecheck**

`src/lib/db/schema.ts` re-exports the tables and builds `relations`. This task adds **no new table**, so neither the `schema` const nor any `relations` block changes, and `Artist` / `NewArtist` / `Track` / `NewTrack` widen on their own. Verify nothing broke:

Run: `yarn check`
Expected: 0 errors. If `svelte-check` reports errors where `artist.userId` is passed to something expecting `string`, that is a real find — record the file and line, but **do not fix it here**; those call sites belong to slice S2a.

- [ ] **Step 8: Generate the migration and read the SQL**

Run: `yarn db:generate`

Open the new file under `drizzle/migrations/`. It must contain, and must contain nothing else:

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
```

**Stop and report if you see any `DROP TABLE`, `DROP COLUMN`, or any statement touching a table not listed above** — that means the local schema had drifted from the DB and this migration would destroy data.

- [ ] **Step 9: Apply the migration**

Run: `yarn db:migrate`
Expected: applies cleanly. Existing rows are unaffected — every added column has a default or is nullable, and dropping `NOT NULL` never rewrites data.

- [ ] **Step 10: Commit**

```bash
yarn format
git add src/lib/db/schemas/artist.ts src/lib/db/schemas/catalog.ts src/lib/db/schemas/finance.ts src/lib/db/schema.seeded.spec.ts drizzle/migrations
git commit -m "feat(db): allow ownerless artists and external-sourced tracks"
```

---

## Task 2: Audius adapter

**Files:**

- Create: `src/lib/server/catalog-source/types.ts`
- Create: `src/lib/server/catalog-source/adapters/AudiusAdapter.ts`
- Create: `src/lib/server/catalog-source/adapters/fixtures/users-search-deadmau5.json`
- Create: `src/lib/server/catalog-source/adapters/fixtures/user-tracks-LKdlD.json`
- Test: `src/lib/server/catalog-source/adapters/AudiusAdapter.spec.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `type CatalogSource = 'audius'`
  - `interface ExternalArtist` — fields listed in Step 1.
  - `interface ExternalTrack` — fields listed in Step 1.
  - `AudiusAdapter.searchArtists(query: string): Promise<ExternalArtist[]>`
  - `AudiusAdapter.listTracks(externalId: string): Promise<ExternalTrack[]>`
  - `AudiusAdapter.streamUrlFor(externalId: string): string`

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

Fixtures are trimmed real responses — only the fields the adapter reads, plus the shape that proves the gates work. Create `src/lib/server/catalog-source/adapters/fixtures/users-search-deadmau5.json`:

```json
{
	"data": [
		{
			"id": "LKdlD",
			"handle": "deadmau5",
			"name": "deadmau5",
			"bio": "cube v3 on standby until further notice ;)",
			"follower_count": 94917,
			"track_count": 9,
			"album_count": 0,
			"is_verified": true,
			"is_deactivated": false,
			"erc_wallet": "0x8aada2f1b43f4a36edea369dc01ed30abb9df9cd",
			"profile_picture": {
				"150x150": "https://cn11.example/content/Qm1/150x150.jpg",
				"1000x1000": "https://cn11.example/content/Qm1/1000x1000.jpg"
			},
			"cover_photo": {
				"640x": "https://cn3.example/content/Qm2/640x.jpg",
				"2000x": "https://cn3.example/content/Qm2/2000x.jpg"
			}
		},
		{
			"id": "D8OGl",
			"handle": "deadmau54321",
			"name": "deadmau5",
			"bio": null,
			"follower_count": 704,
			"track_count": 0,
			"album_count": 3,
			"is_verified": false,
			"is_deactivated": false,
			"erc_wallet": "0x10bfe7a503472a6a0c03ae33fff110542a71d931",
			"profile_picture": null,
			"cover_photo": null
		}
	]
}
```

Create `src/lib/server/catalog-source/adapters/fixtures/user-tracks-LKdlD.json`:

```json
{
	"data": [
		{
			"id": "7YmNr",
			"title": "deadmau5 - Nextra (Stem Drop)",
			"duration": 61,
			"genre": "Electronic",
			"mood": "Cool",
			"release_date": "2021-05-11T15:05:00Z",
			"play_count": 106778,
			"permalink": "/deadmau5/deadmau5-nextra-stem-drop-402369",
			"license": "All rights reserved",
			"isrc": "GBTDG1302232",
			"is_streamable": true,
			"is_available": true,
			"is_stream_gated": false,
			"is_unlisted": false,
			"is_delete": false,
			"access": { "stream": true, "download": false },
			"field_visibility": { "genre": true, "mood": true, "play_count": true },
			"artwork": {
				"150x150": "https://cn3.example/content/Qm3/150x150.jpg",
				"1000x1000": "https://cn3.example/content/Qm3/1000x1000.jpg"
			}
		},
		{
			"id": "GATED1",
			"title": "Token gated demo",
			"duration": 180,
			"genre": "Electronic",
			"release_date": "2024-02-01T00:00:00Z",
			"play_count": 12,
			"permalink": "/deadmau5/token-gated-demo",
			"license": null,
			"isrc": null,
			"is_streamable": true,
			"is_available": true,
			"is_stream_gated": true,
			"is_unlisted": false,
			"is_delete": false,
			"access": { "stream": false, "download": false },
			"field_visibility": { "play_count": true },
			"artwork": null
		},
		{
			"id": "HIDDEN1",
			"title": "Unlisted work in progress",
			"duration": 95,
			"genre": null,
			"release_date": "2024-05-01T00:00:00Z",
			"play_count": 3,
			"permalink": "/deadmau5/unlisted-wip",
			"license": null,
			"isrc": null,
			"is_streamable": true,
			"is_available": true,
			"is_stream_gated": false,
			"is_unlisted": true,
			"is_delete": false,
			"access": { "stream": true, "download": false },
			"field_visibility": { "play_count": false },
			"artwork": null
		}
	]
}
```

- [ ] **Step 3: Write the failing test**

Create `src/lib/server/catalog-source/adapters/AudiusAdapter.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudiusAdapter } from './AudiusAdapter';
import users from './fixtures/users-search-deadmau5.json';
import tracks from './fixtures/user-tracks-LKdlD.json';

function mockFetch(body: unknown) {
	return vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
}

beforeEach(() => {
	vi.stubGlobal('fetch', mockFetch(users));
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('AudiusAdapter.searchArtists', () => {
	it('maps a user onto our shape without leaking Audius field names', async () => {
		const [first] = await AudiusAdapter.searchArtists('deadmau5');
		expect(first).toEqual({
			source: 'audius',
			externalId: 'LKdlD',
			handle: 'deadmau5',
			name: 'deadmau5',
			bio: 'cube v3 on standby until further notice ;)',
			avatarUrl: 'https://cn11.example/content/Qm1/1000x1000.jpg',
			bannerUrl: 'https://cn3.example/content/Qm2/2000x.jpg',
			externalUrl: 'https://audius.co/deadmau5',
			followerCount: 94917,
			trackCount: 9,
			isVerified: true,
			isDeactivated: false,
			walletAddress: '0x8aada2f1b43f4a36edea369dc01ed30abb9df9cd'
		});
	});

	it('returns the impostor too, rather than silently picking a winner', async () => {
		const found = await AudiusAdapter.searchArtists('deadmau5');
		expect(found.map((a) => a.externalId)).toEqual(['LKdlD', 'D8OGl']);
	});

	it('survives a user with no pictures', async () => {
		const found = await AudiusAdapter.searchArtists('deadmau5');
		expect(found[1]).toMatchObject({ avatarUrl: null, bannerUrl: null, isVerified: false });
	});

	it('sends app_name so Audius can attribute the traffic', async () => {
		await AudiusAdapter.searchArtists('deadmau5');
		const url = String((globalThis.fetch as ReturnType<typeof mockFetch>).mock.calls[0][0]);
		expect(url).toContain('app_name=PDM');
	});

	it('raises a typed error when the source is unreachable', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('nope', { status: 503 }))
		);
		await expect(AudiusAdapter.searchArtists('deadmau5')).rejects.toThrow(
			'audius: users/search failed with 503'
		);
	});
});

describe('AudiusAdapter.listTracks', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', mockFetch(tracks));
	});

	it('maps a playable track and stores the STABLE stream endpoint', async () => {
		const [first] = await AudiusAdapter.listTracks('LKdlD');
		expect(first).toEqual({
			source: 'audius',
			externalId: '7YmNr',
			title: 'deadmau5 - Nextra (Stem Drop)',
			durationSeconds: 61,
			genre: 'Electronic',
			imageUrl: 'https://cn3.example/content/Qm3/1000x1000.jpg',
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

	it('skips a token-gated track we could never actually play', async () => {
		const found = await AudiusAdapter.listTracks('LKdlD');
		expect(found.map((t) => t.externalId)).not.toContain('GATED1');
	});

	it('skips an unlisted track the artist deliberately hid', async () => {
		const found = await AudiusAdapter.listTracks('LKdlD');
		expect(found.map((t) => t.externalId)).not.toContain('HIDDEN1');
	});

	it('keeps only the one playable track from the fixture', async () => {
		const found = await AudiusAdapter.listTracks('LKdlD');
		expect(found).toHaveLength(1);
	});
});

describe('AudiusAdapter play-count visibility', () => {
	it('drops a play count the artist chose to hide', () => {
		const hidden = {
			...tracks.data[0],
			id: 'X1',
			field_visibility: { play_count: false }
		};
		expect(AudiusAdapter.toExternalTrack(hidden)?.playCount).toBeNull();
	});
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/catalog-source/adapters/AudiusAdapter.spec.ts`
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
 * else. Verified against the live API on 2026-08-29.
 */
export class AudiusAdapter {
	static async searchArtists(query: string): Promise<ExternalArtist[]> {
		const raw = await get<{ data: AudiusUser[] }>(
			`/users/search?query=${encodeURIComponent(query)}`,
			'users/search'
		);
		return raw.data.map(toExternalArtist);
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

	/** The stable endpoint. It 302s to a signed URL at request time — we never store that. */
	static streamUrlFor(externalId: string): string {
		return `${BASE}/tracks/${externalId}/stream`;
	}

	/**
	 * Returns null for any track we must not import. Six independent flags can make a
	 * track unplayable or private; a gated one would import cleanly and only fail when
	 * a listener pressed play.
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
			imageUrl: raw.artwork?.['1000x1000'] ?? null,
			streamUrl: AudiusAdapter.streamUrlFor(raw.id),
			releaseDate: raw.release_date ? new Date(raw.release_date) : null,
			playCount: raw.field_visibility?.play_count === false ? null : (raw.play_count ?? null),
			license: raw.license ?? null,
			isrc: raw.isrc ?? null
		};
	}
}

function toExternalArtist(raw: AudiusUser): ExternalArtist {
	return {
		source: 'audius',
		externalId: raw.id,
		handle: raw.handle,
		name: raw.name,
		bio: raw.bio ?? null,
		avatarUrl: raw.profile_picture?.['1000x1000'] ?? null,
		bannerUrl: raw.cover_photo?.['2000x'] ?? null,
		externalUrl: `${PROFILE_BASE}/${raw.handle}`,
		followerCount: raw.follower_count ?? 0,
		trackCount: raw.track_count ?? 0,
		isVerified: raw.is_verified === true,
		isDeactivated: raw.is_deactivated === true,
		walletAddress: raw.erc_wallet ?? null
	};
}

async function get<T>(path: string, label: string): Promise<T> {
	const sep = path.includes('?') ? '&' : '?';
	const res = await fetch(`${BASE}${path}${sep}app_name=${APP_NAME}`);
	if (!res.ok) {
		throw new Error(`audius: ${label} failed with ${res.status}`);
	}
	return (await res.json()) as T;
}

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
	profile_picture?: Record<string, string> | null;
	cover_photo?: Record<string, string> | null;
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
	artwork?: Record<string, string> | null;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/catalog-source/adapters/AudiusAdapter.spec.ts`
Expected: PASS, 11 tests.

- [ ] **Step 7: Commit**

```bash
yarn format
git add src/lib/server/catalog-source
git commit -m "feat(catalog-source): add Audius adapter with per-track import gates"
```

---

## Task 3: Idempotent repository

**Files:**

- Create: `src/lib/db/services/SeededCatalogRepository.ts`
- Test: `src/lib/db/services/SeededCatalogRepository.spec.ts`

**Interfaces:**

- Consumes: `ExternalArtist`, `ExternalTrack` from `src/lib/server/catalog-source/types`.
- Produces:
  - `SeededCatalogRepository.upsertArtist(input: ExternalArtist, slug: string): Promise<{ id: string }>`
  - `SeededCatalogRepository.upsertTracks(artistId: string, input: ExternalTrack[]): Promise<{ imported: number }>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/db/services/SeededCatalogRepository.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const onConflictDoUpdate = vi.fn(() => ({ returning: vi.fn(async () => [{ id: 'artist-1' }]) }));
const values = vi.fn(() => ({ onConflictDoUpdate }));
const insert = vi.fn(() => ({ values }));

vi.mock('$lib/db', () => ({
	db: { insert },
	withDbLogging: vi.fn(async (_name: string, fn: () => unknown) => fn())
}));

import { SeededCatalogRepository } from './SeededCatalogRepository';
import type { ExternalArtist, ExternalTrack } from '$lib/server/catalog-source/types';

const artist: ExternalArtist = {
	source: 'audius',
	externalId: 'LKdlD',
	handle: 'deadmau5',
	name: 'deadmau5',
	bio: 'cube v3',
	avatarUrl: 'https://cdn.example/a.jpg',
	bannerUrl: 'https://cdn.example/b.jpg',
	externalUrl: 'https://audius.co/deadmau5',
	followerCount: 94917,
	trackCount: 9,
	isVerified: true,
	isDeactivated: false,
	walletAddress: '0xabc'
};

const track: ExternalTrack = {
	source: 'audius',
	externalId: '7YmNr',
	title: 'Nextra',
	durationSeconds: 61,
	genre: 'Electronic',
	imageUrl: 'https://cdn.example/t.jpg',
	streamUrl: 'https://api.audius.co/v1/tracks/7YmNr/stream',
	releaseDate: new Date('2021-05-11T15:05:00Z'),
	playCount: 106778,
	license: 'All rights reserved',
	isrc: 'GBTDG1302232'
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe('SeededCatalogRepository.upsertArtist', () => {
	it('writes the artist with no owner and the source recorded', async () => {
		await SeededCatalogRepository.upsertArtist(artist, 'deadmau5');
		expect(values).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: null,
				origin: 'audius',
				externalId: 'LKdlD',
				externalUrl: 'https://audius.co/deadmau5',
				name: 'deadmau5',
				slug: 'deadmau5',
				avatar: 'https://cdn.example/a.jpg',
				coverImg: 'https://cdn.example/b.jpg'
			})
		);
	});

	it('never sets claimedAt on import — that is the claim flow’s job', async () => {
		await SeededCatalogRepository.upsertArtist(artist, 'deadmau5');
		expect(values.mock.calls[0][0]).not.toHaveProperty('claimedAt');
	});

	it('re-imports into the same row by keying on origin and external id', async () => {
		await SeededCatalogRepository.upsertArtist(artist, 'deadmau5');
		const conflict = onConflictDoUpdate.mock.calls[0][0] as { target: unknown[]; set: object };
		expect(conflict.target).toHaveLength(2);
	});

	it('refreshes mutable fields on re-import but not identity', async () => {
		await SeededCatalogRepository.upsertArtist(artist, 'deadmau5');
		const conflict = onConflictDoUpdate.mock.calls[0][0] as { set: Record<string, unknown> };
		expect(Object.keys(conflict.set).sort()).toEqual(
			['avatar', 'coverImg', 'description', 'name', 'updatedAt'].sort()
		);
	});

	it('returns the row id so tracks can be parented', async () => {
		const result = await SeededCatalogRepository.upsertArtist(artist, 'deadmau5');
		expect(result).toEqual({ id: 'artist-1' });
	});
});

describe('SeededCatalogRepository.upsertTracks', () => {
	it('marks imported tracks ready, published and public', async () => {
		await SeededCatalogRepository.upsertTracks('artist-1', [track]);
		expect(values).toHaveBeenCalledWith([
			expect.objectContaining({
				artistId: 'artist-1',
				audioSource: 'audius',
				externalId: '7YmNr',
				audioUrl: 'https://api.audius.co/v1/tracks/7YmNr/stream',
				status: 'ready',
				isPublished: true,
				visibility: 'public'
			})
		]);
	});

	it('keeps the licence and ISRC with the music', async () => {
		await SeededCatalogRepository.upsertTracks('artist-1', [track]);
		const row = (values.mock.calls[0][0] as Array<{ metadata: unknown }>)[0];
		expect(row.metadata).toEqual({ license: 'All rights reserved', isrc: 'GBTDG1302232' });
	});

	it('reports how many rows it wrote', async () => {
		const result = await SeededCatalogRepository.upsertTracks('artist-1', [track]);
		expect(result).toEqual({ imported: 1 });
	});

	it('does not touch the database for an empty list', async () => {
		const result = await SeededCatalogRepository.upsertTracks('artist-1', []);
		expect(insert).not.toHaveBeenCalled();
		expect(result).toEqual({ imported: 0 });
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test:unit -- --run src/lib/db/services/SeededCatalogRepository.spec.ts`
Expected: FAIL — `Failed to resolve import "./SeededCatalogRepository"`.

- [ ] **Step 3: Write the repository**

Create `src/lib/db/services/SeededCatalogRepository.ts`:

```ts
import { sql } from 'drizzle-orm';
import { db, withDbLogging } from '$lib/db';
import { artists, tracks } from '$lib/db/schema';
import type { ExternalArtist, ExternalTrack } from '$lib/server/catalog-source/types';

/**
 * The only writer of seeded catalog rows. Both methods are idempotent: re-running an
 * import updates the same rows rather than duplicating them, and neither ever touches
 * PDM-side data (chat, comments, likes, subscriptions).
 */
export class SeededCatalogRepository {
	static async upsertArtist(input: ExternalArtist, slug: string): Promise<{ id: string }> {
		return withDbLogging('SeededCatalogRepository.upsertArtist', async () => {
			const [row] = await db
				.insert(artists)
				.values({
					userId: null,
					name: input.name,
					slug,
					avatar: input.avatarUrl,
					coverImg: input.bannerUrl,
					description: input.bio,
					origin: input.source,
					externalId: input.externalId,
					externalUrl: input.externalUrl
				})
				// The predicate must match the partial index in schemas/artist.ts exactly,
				// or Postgres will not use it and the upsert becomes a duplicate-key error.
				.onConflictDoUpdate({
					target: [artists.origin, artists.externalId],
					targetWhere: sql`${artists.origin} <> 'native'`,
					set: {
						name: input.name,
						avatar: input.avatarUrl,
						coverImg: input.bannerUrl,
						description: input.bio,
						updatedAt: new Date()
					}
				})
				.returning({ id: artists.id });
			return { id: row.id };
		});
	}

	static async upsertTracks(
		artistId: string,
		input: ExternalTrack[]
	): Promise<{ imported: number }> {
		if (input.length === 0) return { imported: 0 };

		return withDbLogging('SeededCatalogRepository.upsertTracks', async () => {
			await db
				.insert(tracks)
				.values(
					input.map((t) => ({
						artistId,
						title: t.title,
						duration: t.durationSeconds,
						audioUrl: t.streamUrl,
						imageUrl: t.imageUrl,
						genre: t.genre ? [t.genre] : null,
						audioSource: t.source,
						externalId: t.externalId,
						// Imported audio skips the whole R2 upload lifecycle: it is already live.
						status: 'ready',
						isPublished: true,
						visibility: 'public',
						metadata: { license: t.license, isrc: t.isrc }
					}))
				)
				.onConflictDoUpdate({
					target: [tracks.audioSource, tracks.externalId],
					set: {
						title: sql`excluded.title`,
						duration: sql`excluded.duration`,
						audioUrl: sql`excluded.audio_url`,
						imageUrl: sql`excluded.image_url`,
						updatedAt: new Date()
					}
				});
			return { imported: input.length };
		});
	}
}
```

- [ ] **Step 4: Add the track uniqueness the upsert depends on**

`upsertTracks` conflicts on `(audio_source, external_id)`, which needs its own partial unique index. In `src/lib/db/schemas/catalog.ts`, add to the `tracks` table's index array (which already holds `tracks_artist_status_idx` and `tracks_published_status_idx`):

```ts
uniqueIndex('tracks_source_external_unique')
	.on(table.audioSource, table.externalId)
	.where(sql`${table.audioSource} <> 'r2'`);
```

Add `uniqueIndex` to the `drizzle-orm/pg-core` import and `import { sql } from 'drizzle-orm';` at the top of the file.

Then: `yarn db:generate`, read the SQL (it must contain only the one `CREATE UNIQUE INDEX`), then `yarn db:migrate`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `yarn test:unit -- --run src/lib/db/services/SeededCatalogRepository.spec.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Commit**

```bash
yarn format
yarn check
git add src/lib/db/services/SeededCatalogRepository.ts src/lib/db/services/SeededCatalogRepository.spec.ts src/lib/db/schemas/catalog.ts drizzle/migrations
git commit -m "feat(db): idempotent upserts for seeded artists and tracks"
```

---

## Task 4: CatalogSourceService

**Files:**

- Create: `src/lib/server/catalog-source/CatalogSourceService.ts`
- Create: `src/lib/server/catalog-source/index.ts`
- Test: `src/lib/server/catalog-source/CatalogSourceService.spec.ts`

**Interfaces:**

- Consumes: `AudiusAdapter.searchArtists`, `AudiusAdapter.listTracks` (Task 2); `SeededCatalogRepository.upsertArtist`, `.upsertTracks` (Task 3).
- Produces:
  - `CatalogSourceService.lookupArtist(query: string): Promise<ArtistCandidate[]>` where `ArtistCandidate = { externalId, handle, name, followerCount, trackCount, isVerified, externalUrl }`
  - `CatalogSourceService.importArtist(externalId: string, opts?: { allowUnverified?: boolean }): Promise<ImportResult>` where `ImportResult = { ok: true; artistId: string; slug: string; tracksImported: number } | { ok: false; reason: 'not_found' | 'unverified' | 'deactivated' | 'no_tracks' }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/server/catalog-source/CatalogSourceService.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./adapters/AudiusAdapter', () => ({
	AudiusAdapter: { searchArtists: vi.fn(), listTracks: vi.fn() }
}));
vi.mock('$lib/db/services/SeededCatalogRepository', () => ({
	SeededCatalogRepository: { upsertArtist: vi.fn(), upsertTracks: vi.fn() }
}));

import { AudiusAdapter } from './adapters/AudiusAdapter';
import { SeededCatalogRepository } from '$lib/db/services/SeededCatalogRepository';
import { CatalogSourceService } from './CatalogSourceService';
import type { ExternalArtist, ExternalTrack } from './types';

const verified: ExternalArtist = {
	source: 'audius',
	externalId: 'LKdlD',
	handle: 'deadmau5',
	name: 'deadmau5',
	bio: null,
	avatarUrl: null,
	bannerUrl: null,
	externalUrl: 'https://audius.co/deadmau5',
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
	trackCount: 3,
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
	vi.mocked(SeededCatalogRepository.upsertArtist).mockResolvedValue({ id: 'artist-1' });
	vi.mocked(SeededCatalogRepository.upsertTracks).mockResolvedValue({ imported: 1 });
});

describe('CatalogSourceService.lookupArtist', () => {
	it('returns every candidate so a human decides, never picking one', async () => {
		vi.mocked(AudiusAdapter.searchArtists).mockResolvedValue([verified, impostor]);
		const found = await CatalogSourceService.lookupArtist('deadmau5');
		expect(found.map((c) => c.externalId)).toEqual(['LKdlD', 'D8OGl']);
	});

	it('surfaces the signals a human needs to tell them apart', async () => {
		vi.mocked(AudiusAdapter.searchArtists).mockResolvedValue([verified, impostor]);
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
		expect(SeededCatalogRepository.upsertArtist).not.toHaveBeenCalled();
	});
});

describe('CatalogSourceService.importArtist gates', () => {
	it('refuses an unverified artist by default', async () => {
		vi.mocked(AudiusAdapter.searchArtists).mockResolvedValue([impostor]);
		const result = await CatalogSourceService.importArtist('D8OGl');
		expect(result).toEqual({ ok: false, reason: 'unverified' });
	});

	it('imports an unverified artist when an admin overrides on purpose', async () => {
		vi.mocked(AudiusAdapter.searchArtists).mockResolvedValue([impostor]);
		vi.mocked(AudiusAdapter.listTracks).mockResolvedValue([track]);
		const result = await CatalogSourceService.importArtist('D8OGl', { allowUnverified: true });
		expect(result).toMatchObject({ ok: true, artistId: 'artist-1' });
	});

	it('refuses a deactivated account', async () => {
		vi.mocked(AudiusAdapter.searchArtists).mockResolvedValue([
			{ ...verified, isDeactivated: true }
		]);
		const result = await CatalogSourceService.importArtist('LKdlD');
		expect(result).toEqual({ ok: false, reason: 'deactivated' });
	});

	it('refuses an artist whose tracks are all unplayable', async () => {
		vi.mocked(AudiusAdapter.searchArtists).mockResolvedValue([verified]);
		vi.mocked(AudiusAdapter.listTracks).mockResolvedValue([]);
		const result = await CatalogSourceService.importArtist('LKdlD');
		expect(result).toEqual({ ok: false, reason: 'no_tracks' });
	});

	it('refuses an id the source does not know', async () => {
		vi.mocked(AudiusAdapter.searchArtists).mockResolvedValue([]);
		const result = await CatalogSourceService.importArtist('NOPE');
		expect(result).toEqual({ ok: false, reason: 'not_found' });
	});

	it('writes nothing when a gate refuses', async () => {
		vi.mocked(AudiusAdapter.searchArtists).mockResolvedValue([impostor]);
		await CatalogSourceService.importArtist('D8OGl');
		expect(SeededCatalogRepository.upsertArtist).not.toHaveBeenCalled();
		expect(SeededCatalogRepository.upsertTracks).not.toHaveBeenCalled();
	});
});

describe('CatalogSourceService.importArtist success path', () => {
	beforeEach(() => {
		vi.mocked(AudiusAdapter.searchArtists).mockResolvedValue([verified]);
		vi.mocked(AudiusAdapter.listTracks).mockResolvedValue([track]);
	});

	it('derives a stable slug from the source handle', async () => {
		await CatalogSourceService.importArtist('LKdlD');
		expect(SeededCatalogRepository.upsertArtist).toHaveBeenCalledWith(verified, 'deadmau5');
	});

	it('parents the tracks to the row the repository returned', async () => {
		await CatalogSourceService.importArtist('LKdlD');
		expect(SeededCatalogRepository.upsertTracks).toHaveBeenCalledWith('artist-1', [track]);
	});

	it('reports what it wrote', async () => {
		const result = await CatalogSourceService.importArtist('LKdlD');
		expect(result).toEqual({
			ok: true,
			artistId: 'artist-1',
			slug: 'deadmau5',
			tracksImported: 1
		});
	});

	it('returns primitives only — no Drizzle row and no Audius object leaks out', async () => {
		const result = await CatalogSourceService.importArtist('LKdlD');
		expect(Object.keys(result).sort()).toEqual(['artistId', 'ok', 'slug', 'tracksImported']);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/catalog-source/CatalogSourceService.spec.ts`
Expected: FAIL — `Failed to resolve import "./CatalogSourceService"`.

- [ ] **Step 3: Write the service**

Create `src/lib/server/catalog-source/CatalogSourceService.ts`:

```ts
import { AudiusAdapter } from './adapters/AudiusAdapter';
import { SeededCatalogRepository } from '$lib/db/services/SeededCatalogRepository';
import type { ExternalArtist } from './types';

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

export type ImportResult =
	| { ok: true; artistId: string; slug: string; tracksImported: number }
	| { ok: false; reason: 'not_found' | 'unverified' | 'deactivated' | 'no_tracks' };

/**
 * Application boundary for importing catalog from an external source. Returns only
 * primitives — no Drizzle row and no adapter type crosses this seam, so the
 * in-process implementation can become a remote Catalog client later.
 *
 * `lookupArtist` is deliberately separate from `importArtist`, and `importArtist`
 * takes an id rather than a search string: a search for a well-known name returns
 * several accounts using it, and auto-importing the top hit would eventually seed a
 * page under a real artist's name built from an impostor's uploads.
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
		const artist = await findById(externalId);
		if (!artist) return { ok: false, reason: 'not_found' };
		if (artist.isDeactivated) return { ok: false, reason: 'deactivated' };
		if (!artist.isVerified && !opts.allowUnverified) {
			return { ok: false, reason: 'unverified' };
		}

		// Gate on what is actually playable, not on the source's own track_count:
		// gated, unlisted and deleted tracks are filtered out by the adapter.
		const tracks = await AudiusAdapter.listTracks(artist.externalId);
		if (tracks.length === 0) return { ok: false, reason: 'no_tracks' };

		const slug = artist.handle.toLowerCase();
		const { id } = await SeededCatalogRepository.upsertArtist(artist, slug);
		const { imported } = await SeededCatalogRepository.upsertTracks(id, tracks);

		return { ok: true, artistId: id, slug, tracksImported: imported };
	}
}

/**
 * Audius has no public "get user by id" that takes the short id form we hold, so an
 * id is resolved through search. Swapping this for a direct lookup later changes
 * nothing above it.
 */
async function findById(externalId: string): Promise<ExternalArtist | null> {
	const found = await AudiusAdapter.searchArtists(externalId);
	return found.find((a) => a.externalId === externalId) ?? found[0] ?? null;
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
```

- [ ] **Step 4: Write the barrel**

Create `src/lib/server/catalog-source/index.ts`:

```ts
export { CatalogSourceService } from './CatalogSourceService';
export type { ArtistCandidate, ImportResult } from './CatalogSourceService';
export type { CatalogSource, ExternalArtist, ExternalTrack } from './types';
```

Consumers import from `$lib/server/catalog-source` only. `AudiusAdapter` is deliberately **not** exported — nothing outside the boundary may reach the source directly.

- [ ] **Step 5: Run the test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/catalog-source/CatalogSourceService.spec.ts`
Expected: PASS, 13 tests.

- [ ] **Step 6: Commit**

```bash
yarn format
yarn check
git add src/lib/server/catalog-source
git commit -m "feat(catalog-source): gate and orchestrate artist import"
```

---

## Task 5: Admin entrypoint and coverage

**Files:**

- Create: `scripts/import-artist.ts`
- Modify: `vite.config.ts` (the `test.coverage.include` array)
- Modify: `package.json` (add the `import:artist` script)

**Interfaces:**

- Consumes: `CatalogSourceService.lookupArtist`, `.importArtist` from `$lib/server/catalog-source`.
- Produces: `yarn import:artist --search "<name>"` and `yarn import:artist --id <externalId> [--allow-unverified]`.

- [ ] **Step 1: Write the script**

Create `scripts/import-artist.ts`:

```ts
/**
 * Admin entrypoint for seeding an artist. Two steps on purpose: search first, read the
 * candidates, then import the id you chose. There is no "import the top hit" path.
 *
 *   yarn import:artist --search "deadmau5"
 *   yarn import:artist --id LKdlD
 *   yarn import:artist --id D8OGl --allow-unverified
 */
import 'dotenv/config';
import { CatalogSourceService } from '../src/lib/server/catalog-source';

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
		console.error(`Refused: ${result.reason}`);
		process.exitCode = 1;
		return;
	}
	console.log(
		`Imported ${result.slug} (artist ${result.artistId}) with ${result.tracksImported} tracks.`
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

- [ ] **Step 2: Register the script**

In `package.json`, add to `"scripts"`:

```json
		"import:artist": "vite-node scripts/import-artist.ts"
```

If `vite-node` is not already a dependency, run `yarn add -D vite-node` first — it resolves the `$lib` alias, which `tsx` and plain `node` do not.

- [ ] **Step 3: Add the new code to coverage**

In `vite.config.ts`, inside `test.coverage.include`, add these two entries alongside the existing ones:

```ts
				'src/lib/server/catalog-source/**',
				'src/lib/db/services/SeededCatalogRepository.ts',
```

`**/index.ts` and `**/types.ts` are already excluded globally, so the barrel and the DTO file are not counted.

- [ ] **Step 4: Verify the whole slice**

Run: `yarn test:unit -- --run src/lib/server/catalog-source src/lib/db/services/SeededCatalogRepository.spec.ts src/lib/db/schema.seeded.spec.ts`
Expected: PASS, 40 tests, and coverage for the new paths at or above the 90% threshold.

Run: `yarn check`
Expected: 0 errors.

Run: `yarn lint`
Expected: clean.

- [ ] **Step 5: Smoke-test against the live API**

Run: `yarn import:artist --search "deadmau5"`
Expected: a table with at least two rows, the verified one showing `isVerified: true`.

Run: `yarn import:artist --id LKdlD`
Expected: `Imported deadmau5 (artist <uuid>) with N tracks.`

Run it a **second time**, unchanged.
Expected: the same artist uuid and the same track count — this is the idempotency proof against the real database, not a mock.

- [ ] **Step 6: Commit**

```bash
yarn format
git add scripts/import-artist.ts vite.config.ts package.json yarn.lock
git commit -m "feat(catalog-source): admin import script and coverage"
```

---

## Done when

- `yarn test:unit --run`, `yarn check` and `yarn lint` all pass.
- `yarn import:artist --id LKdlD` run twice produces one artist row and one set of tracks.
- No route, no UI and no existing page references any of the new code — S1 is invisible to users by design.
- The `svelte-check` findings from Task 1 Step 7 (call sites assuming `artist.userId` is a `string`) are written down and carried into slice S2a.
