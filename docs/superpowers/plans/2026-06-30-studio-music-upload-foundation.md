# Studio Music Upload — Foundation (Plan A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the isolated, hardened, fully-tested server foundation for Studio music — a `MusicApplicationService` boundary, a `visibility` gate on tracks+albums with album→track inheritance, an `EventPublisher` seam, and upload security baseline — wrapping today's exact upload behavior with zero UI/behavior regression.

**Architecture:** Routes become thin wrappers over `src/lib/server/music/MusicApplicationService` (returns DTOs, enforces artist ownership). The boundary delegates to existing DB services (`TrackService`/`AlbumService`/`AlbumTrackService`/`GenreService`), the Media seam (`MediaUploadService`), and a new `EventPublisher` (log impl now). Reusable validation + rate-limit modules guard uploads. The seam is built test-first to ≥90% coverage.

**Tech Stack:** SvelteKit 2, Svelte 5, TypeScript, Drizzle ORM + Postgres, Cloudflare R2 (S3 SDK), vitest (node + browser projects), `@vitest/coverage-v8`.

## Global Constraints

- **TDD, test-first**, on all server boundary code (red → green → refactor). No boundary code without a failing test first.
- **Coverage gate ≥90%** (lines + branches + functions + statements) over `src/lib/server/music/**`, `src/lib/server/events/**`, `src/lib/server/media/validation.ts`, `src/lib/server/security/**`. Enforced via `yarn test:coverage`.
- **No Drizzle row / `$inferSelect` types leak across the boundary** — boundary returns DTOs only (plain serializable shapes).
- **Boundary methods take `artistId` explicitly** and enforce `record.artistId === artistId` on every track/album/albumTrack mutation.
- **Visibility values:** exactly `'public' | 'subscribers_only'`, default `'public'`.
- **MUST NOT regress** the `createTrack` `FormData` contract (`metadata`, `type`, `file_name`, `file_size`, `cover_type/title/size`), the resume-key format `pdm:track-upload:${trackId}:${audio|cover}`, and the create→resume→finalize state machine.
- Indentation is **tabs** (project `.prettierrc`). Run `yarn format` before each commit.
- Package manager is **yarn**.
- DB workflow per CLAUDE.md: edit domain schema → `schema.ts` aggregator → `yarn db:generate` → review SQL → `yarn db:migrate`.

---

### Task 1: Test coverage tooling

**Files:**
- Modify: `package.json` (devDependency + script)
- Modify: `vite.config.ts:19-47` (coverage config on the `server` project)

**Interfaces:**
- Produces: `yarn test:coverage` script that runs the server project with v8 coverage and the ≥90% thresholds scoped to the seam paths.

- [ ] **Step 1: Add the coverage dependency**

Run (version must match `vitest@^3.2.3`):

```bash
yarn add -D @vitest/coverage-v8@^3.2.3
```

- [ ] **Step 2: Add the `test:coverage` script**

In `package.json` `scripts`, add after the `test:e2e` line:

```json
		"test:coverage": "vitest --run --project server --coverage",
```

- [ ] **Step 3: Configure coverage on the server project**

In `vite.config.ts`, replace the `server` project's `test` block (lines ~37-45) so it includes coverage config:

```ts
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					coverage: {
						provider: 'v8',
						include: [
							'src/lib/server/music/**',
							'src/lib/server/events/**',
							'src/lib/server/media/validation.ts',
							'src/lib/server/security/**'
						],
						thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 }
					}
				}
			}
```

- [ ] **Step 4: Verify the script runs (no seam files yet → empty coverage is fine)**

Run: `yarn test:coverage`
Expected: vitest runs the server project, exits 0 (no spec files yet, or only pre-existing ones). If it errors that no tests are found, that's acceptable at this point — proceed.

- [ ] **Step 5: Commit**

```bash
yarn format
git add package.json vite.config.ts yarn.lock
git commit -m "chore: add v8 coverage tooling and test:coverage script"
```

---

### Task 2: Media upload validation module

**Files:**
- Create: `src/lib/server/media/validation.ts`
- Test: `src/lib/server/media/validation.spec.ts`

**Interfaces:**
- Produces:
  - `AUDIO_MIME_TYPES: Set<string>`, `IMAGE_MIME_TYPES: Set<string>`
  - `MAX_AUDIO_SIZE: number` (100 MB), `MAX_IMAGE_SIZE: number` (10 MB), `MAX_MULTIPART_PARTS: number` (2000)
  - `validateAudioUpload(input: { contentType: string; size: number }): { ok: true } | { ok: false; reason: string }`
  - `validateImageUpload(input: { contentType: string; size: number }): { ok: true } | { ok: false; reason: string }`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/server/media/validation.spec.ts
import { describe, it, expect } from 'vitest';
import {
	validateAudioUpload,
	validateImageUpload,
	MAX_AUDIO_SIZE,
	MAX_IMAGE_SIZE
} from './validation';

describe('validateAudioUpload', () => {
	it('accepts a valid mp3 within size', () => {
		expect(validateAudioUpload({ contentType: 'audio/mpeg', size: 1024 })).toEqual({ ok: true });
	});
	it('rejects a non-audio content type', () => {
		const result = validateAudioUpload({ contentType: 'application/pdf', size: 1024 });
		expect(result.ok).toBe(false);
	});
	it('rejects audio over the max size', () => {
		const result = validateAudioUpload({ contentType: 'audio/mpeg', size: MAX_AUDIO_SIZE + 1 });
		expect(result.ok).toBe(false);
	});
	it('rejects zero / non-finite size', () => {
		expect(validateAudioUpload({ contentType: 'audio/mpeg', size: 0 }).ok).toBe(false);
		expect(validateAudioUpload({ contentType: 'audio/mpeg', size: NaN }).ok).toBe(false);
	});
});

describe('validateImageUpload', () => {
	it('accepts a valid jpeg within size', () => {
		expect(validateImageUpload({ contentType: 'image/jpeg', size: 1024 })).toEqual({ ok: true });
	});
	it('rejects an unsupported image format', () => {
		expect(validateImageUpload({ contentType: 'image/gif', size: 1024 }).ok).toBe(false);
	});
	it('rejects image over the max size', () => {
		expect(validateImageUpload({ contentType: 'image/png', size: MAX_IMAGE_SIZE + 1 }).ok).toBe(false);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/media/validation.spec.ts`
Expected: FAIL — cannot resolve `./validation`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/server/media/validation.ts
export const AUDIO_MIME_TYPES = new Set([
	'audio/mpeg',
	'audio/mp3',
	'audio/wav',
	'audio/x-wav',
	'audio/wave'
]);

export const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const MAX_AUDIO_SIZE = 100 * 1024 * 1024;
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_MULTIPART_PARTS = 2000;

type Result = { ok: true } | { ok: false; reason: string };

function validate(allow: Set<string>, max: number, label: string, input: { contentType: string; size: number }): Result {
	if (!Number.isFinite(input.size) || input.size <= 0) {
		return { ok: false, reason: `${label} size is invalid` };
	}
	if (!allow.has(input.contentType)) {
		return { ok: false, reason: `Unsupported ${label} format` };
	}
	if (input.size > max) {
		return { ok: false, reason: `${label} is too large` };
	}
	return { ok: true };
}

export function validateAudioUpload(input: { contentType: string; size: number }): Result {
	return validate(AUDIO_MIME_TYPES, MAX_AUDIO_SIZE, 'Audio', input);
}

export function validateImageUpload(input: { contentType: string; size: number }): Result {
	return validate(IMAGE_MIME_TYPES, MAX_IMAGE_SIZE, 'Image', input);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/media/validation.spec.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/lib/server/media/validation.ts src/lib/server/media/validation.spec.ts
git commit -m "feat(media): add audio/image upload validation with size+MIME limits"
```

---

### Task 3: Multipart part-count cap

**Files:**
- Modify: `src/lib/server/media/validation.ts`
- Test: `src/lib/server/media/validation.spec.ts`

**Interfaces:**
- Produces: `assertPartCount(size: number, partSize: number): void` — throws `Error('Upload exceeds maximum part count')` when `ceil(size/partSize) > MAX_MULTIPART_PARTS`.

- [ ] **Step 1: Add the failing test**

Append to `src/lib/server/media/validation.spec.ts`:

```ts
import { assertPartCount, MAX_MULTIPART_PARTS } from './validation';
import { R2_MULTIPART_PART_SIZE } from '$lib/db/services/R2Service';

describe('assertPartCount', () => {
	it('passes for a normal file', () => {
		expect(() => assertPartCount(50 * 1024 * 1024, R2_MULTIPART_PART_SIZE)).not.toThrow();
	});
	it('throws when part count exceeds the cap', () => {
		const oversize = (MAX_MULTIPART_PARTS + 1) * R2_MULTIPART_PART_SIZE;
		expect(() => assertPartCount(oversize, R2_MULTIPART_PART_SIZE)).toThrow('maximum part count');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/media/validation.spec.ts`
Expected: FAIL — `assertPartCount` is not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/server/media/validation.ts`:

```ts
export function assertPartCount(size: number, partSize: number): void {
	if (Math.ceil(size / partSize) > MAX_MULTIPART_PARTS) {
		throw new Error('Upload exceeds maximum part count');
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/media/validation.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/lib/server/media/validation.ts src/lib/server/media/validation.spec.ts
git commit -m "feat(media): cap multipart part count to prevent unbounded signing"
```

---

### Task 4: In-memory per-artist rate limiter

**Files:**
- Create: `src/lib/server/security/rateLimiter.ts`
- Test: `src/lib/server/security/rateLimiter.spec.ts`

**Interfaces:**
- Produces: `createRateLimiter(opts: { limit: number; windowMs: number }): { check(key: string, now?: number): boolean }` — returns `true` while under `limit` calls within `windowMs` for a `key`, `false` once exceeded. Sliding fixed-window per key. `now` is injectable for tests.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/server/security/rateLimiter.spec.ts
import { describe, it, expect } from 'vitest';
import { createRateLimiter } from './rateLimiter';

describe('createRateLimiter', () => {
	it('allows up to the limit then blocks', () => {
		const rl = createRateLimiter({ limit: 2, windowMs: 1000 });
		expect(rl.check('artist-1', 0)).toBe(true);
		expect(rl.check('artist-1', 100)).toBe(true);
		expect(rl.check('artist-1', 200)).toBe(false);
	});
	it('resets after the window elapses', () => {
		const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
		expect(rl.check('a', 0)).toBe(true);
		expect(rl.check('a', 500)).toBe(false);
		expect(rl.check('a', 1500)).toBe(true);
	});
	it('tracks keys independently', () => {
		const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
		expect(rl.check('a', 0)).toBe(true);
		expect(rl.check('b', 0)).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/security/rateLimiter.spec.ts`
Expected: FAIL — cannot resolve `./rateLimiter`.

- [ ] **Step 3: Implement**

```ts
// src/lib/server/security/rateLimiter.ts
// In-memory per-instance stopgap. Documented for a Redis token-bucket upgrade later.
interface Window {
	count: number;
	resetAt: number;
}

export function createRateLimiter(opts: { limit: number; windowMs: number }) {
	const windows = new Map<string, Window>();

	function check(key: string, now: number = Date.now()): boolean {
		const existing = windows.get(key);
		if (!existing || now >= existing.resetAt) {
			windows.set(key, { count: 1, resetAt: now + opts.windowMs });
			return true;
		}
		if (existing.count >= opts.limit) {
			return false;
		}
		existing.count += 1;
		return true;
	}

	return { check };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/security/rateLimiter.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/lib/server/security/rateLimiter.ts src/lib/server/security/rateLimiter.spec.ts
git commit -m "feat(security): add in-memory per-artist rate limiter"
```

---

### Task 5: Schema — visibility + content_id columns

**Files:**
- Modify: `src/lib/db/schemas/catalog.ts:22-58` (albums + tracks)
- Generated: `drizzle/migrations/*.sql` (review only)

**Interfaces:**
- Produces: `tracks.visibility`, `albums.visibility` (`varchar(16)` default `'public'` not null), `tracks.contentId` (`uuid`, nullable). `Track`/`Album` types pick these up via `$inferSelect`.

- [ ] **Step 1: Add columns to `albums`**

In `src/lib/db/schemas/catalog.ts`, inside `albums` table after `isPublished`:

```ts
	visibility: varchar('visibility', { length: 16 }).default('public').notNull(),
```

- [ ] **Step 2: Add columns to `tracks`**

Inside `tracks` table after `isPublished`:

```ts
	visibility: varchar('visibility', { length: 16 }).default('public').notNull(),
	contentId: uuid('content_id'),
```

- [ ] **Step 3: Generate the migration**

Run: `yarn db:generate`
Expected: a new file under `drizzle/migrations/` adding three columns. Open it and confirm it is **purely additive** (ALTER TABLE ADD COLUMN with defaults), no drops.

- [ ] **Step 4: Apply the migration**

Run: `yarn db:up` (ensure Postgres is running), then `yarn db:migrate`
Expected: migration applies cleanly; existing rows backfill `visibility='public'`.

- [ ] **Step 5: Type-check**

Run: `yarn check`
Expected: no new type errors (existing code using `Track`/`Album` still compiles; new optional columns don't break inserts because they have defaults / are nullable).

- [ ] **Step 6: Commit**

```bash
yarn format
git add src/lib/db/schemas/catalog.ts drizzle/
git commit -m "feat(db): add visibility gate to tracks+albums and content_id to tracks"
```

---

### Task 6: Event seam — types + LogEventPublisher

**Files:**
- Create: `src/lib/server/events/types.ts`
- Create: `src/lib/server/events/LogEventPublisher.ts`
- Create: `src/lib/server/events/index.ts`
- Test: `src/lib/server/events/LogEventPublisher.spec.ts`

**Interfaces:**
- Produces:
  - `Visibility = 'public' | 'subscribers_only'`
  - `DomainEvent` union (see code), `EventPublisher` interface with `publish(event): Promise<void>`
  - `LogEventPublisher` class; `eventPublisher: EventPublisher` singleton (from `index.ts`).
- Consumes: `logger` from `$lib/utils/logger` (method `logger.info(message, { component, metadata })`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/server/events/LogEventPublisher.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '$lib/utils/logger';
import { LogEventPublisher } from './LogEventPublisher';

vi.mock('$lib/utils/logger', () => ({
	logger: { info: vi.fn() }
}));

describe('LogEventPublisher', () => {
	beforeEach(() => vi.clearAllMocks());

	it('logs the domain event via logger.info', async () => {
		const publisher = new LogEventPublisher();
		const event = {
			type: 'track.uploaded' as const,
			trackId: 't1',
			artistId: 'a1',
			occurredAt: '2026-06-30T00:00:00.000Z'
		};
		await publisher.publish(event);
		expect(logger.info).toHaveBeenCalledWith(
			'domain.event',
			expect.objectContaining({ component: 'events', metadata: { event } })
		);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/events/LogEventPublisher.spec.ts`
Expected: FAIL — cannot resolve `./LogEventPublisher`.

- [ ] **Step 3: Implement the types**

```ts
// src/lib/server/events/types.ts
export type Visibility = 'public' | 'subscribers_only';

export type DomainEvent =
	| { type: 'track.uploaded'; trackId: string; artistId: string; occurredAt: string }
	| { type: 'track.published'; trackId: string; artistId: string; occurredAt: string }
	| {
			type: 'track.visibility_changed';
			trackId: string;
			artistId: string;
			visibility: Visibility;
			occurredAt: string;
	  }
	| { type: 'track.deleted'; trackId: string; artistId: string; occurredAt: string }
	| {
			type: 'album.visibility_changed';
			albumId: string;
			artistId: string;
			visibility: Visibility;
			trackIds: string[];
			occurredAt: string;
	  };

export interface EventPublisher {
	publish(event: DomainEvent): Promise<void>;
}
```

- [ ] **Step 4: Implement the publisher + index**

```ts
// src/lib/server/events/LogEventPublisher.ts
import { logger } from '$lib/utils/logger';
import type { DomainEvent, EventPublisher } from './types';

export class LogEventPublisher implements EventPublisher {
	async publish(event: DomainEvent): Promise<void> {
		logger.info('domain.event', { component: 'events', metadata: { event } });
	}
}
```

```ts
// src/lib/server/events/index.ts
import { LogEventPublisher } from './LogEventPublisher';
import type { EventPublisher } from './types';

export type { DomainEvent, EventPublisher, Visibility } from './types';
export { LogEventPublisher } from './LogEventPublisher';

// Swap point: replace with OutboxEventPublisher / RabbitMqEventPublisher later.
export const eventPublisher: EventPublisher = new LogEventPublisher();
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/events/LogEventPublisher.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
yarn format
git add src/lib/server/events/
git commit -m "feat(events): add EventPublisher seam with LogEventPublisher impl"
```

---

### Task 7: Music DTOs + mappers

**Files:**
- Create: `src/lib/server/music/dto.ts`
- Test: `src/lib/server/music/dto.spec.ts`

**Interfaces:**
- Consumes: `Track`, `Album`, `AlbumTrack`, `Genre`, `TrackStats` from `$lib/db`; `Visibility` from `$lib/server/events`.
- Produces:
  - Types: `TrackDTO`, `AlbumDTO`, `TrackStatsDTO`, `AlbumTrackDTO`, `GenreDTO`, `StudioStatsDTO`, `StudioMusicOverviewDTO`, `UploadIntent`, `TrackUploadStatus`.
  - Mappers: `toTrackDTO(track: Track): TrackDTO`, `toAlbumDTO(album: Album): AlbumDTO`, `toTrackStatsDTO(stats: TrackStats | null): TrackStatsDTO | null`. These strip non-DTO fields (e.g. `audioUrl`→`audioKey`, drop `metadata`) and coerce `visibility` to the union (`'subscribers_only'` only when stored value matches, else `'public'`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/server/music/dto.spec.ts
import { describe, it, expect } from 'vitest';
import { toTrackDTO, toAlbumDTO } from './dto';

const baseTrack = {
	id: 't1', albumId: null, artistId: 'a1', title: 'Song', duration: 120,
	audioUrl: 'a1/tracks/t1/source.mp3', lyrics: null, clipUrl: null,
	imageUrl: 'a1/tracks/t1/cover.jpg', trackNumber: null, genre: ['rock'],
	status: 'uploaded', isPublished: true, visibility: 'subscribers_only',
	contentId: null, metadata: { upload: { secret: 1 } },
	createdAt: new Date('2026-06-30T00:00:00Z'), updatedAt: new Date('2026-06-30T00:00:00Z')
} as any;

describe('toTrackDTO', () => {
	it('maps keys and never leaks audioUrl/metadata', () => {
		const dto = toTrackDTO(baseTrack);
		expect(dto.audioKey).toBe('a1/tracks/t1/source.mp3');
		expect(dto.imageKey).toBe('a1/tracks/t1/cover.jpg');
		expect(dto.visibility).toBe('subscribers_only');
		expect(dto.genres).toEqual(['rock']);
		expect('audioUrl' in dto).toBe(false);
		expect('metadata' in dto).toBe(false);
	});
	it('coerces an unknown visibility to public', () => {
		expect(toTrackDTO({ ...baseTrack, visibility: 'weird' }).visibility).toBe('public');
	});
	it('defaults missing genres to an empty array', () => {
		expect(toTrackDTO({ ...baseTrack, genre: null }).genres).toEqual([]);
	});
});

describe('toAlbumDTO', () => {
	it('maps coverImageUrl to coverImageKey and keeps visibility', () => {
		const dto = toAlbumDTO({
			id: 'al1', artistId: 'a1', title: 'Album', description: null,
			coverImageUrl: 'a1/albums/al1/cover.jpg', releaseDate: null, price: null,
			isPublished: false, visibility: 'public', genres: ['pop'], metadata: null,
			createdAt: new Date('2026-06-30T00:00:00Z'), updatedAt: new Date('2026-06-30T00:00:00Z')
		} as any);
		expect(dto.coverImageKey).toBe('a1/albums/al1/cover.jpg');
		expect(dto.visibility).toBe('public');
		expect('metadata' in dto).toBe(false);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/music/dto.spec.ts`
Expected: FAIL — cannot resolve `./dto`.

- [ ] **Step 3: Implement**

```ts
// src/lib/server/music/dto.ts
import type { Track, Album, TrackStats } from '$lib/db';
import type { Visibility } from '$lib/server/events';

export type TrackUploadStatus =
	| 'draft'
	| 'pending_upload'
	| 'processing'
	| 'uploaded'
	| 'ready'
	| 'failed';

export interface TrackDTO {
	id: string;
	artistId: string;
	albumId: string | null;
	title: string;
	duration: number | null;
	audioKey: string | null;
	imageKey: string | null;
	genres: string[];
	status: TrackUploadStatus;
	visibility: Visibility;
	isPublished: boolean;
	trackNumber: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface AlbumDTO {
	id: string;
	artistId: string;
	title: string;
	description: string | null;
	coverImageKey: string | null;
	releaseDate: string | null;
	genres: string[];
	visibility: Visibility;
	isPublished: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface TrackStatsDTO {
	playCount: number;
	likeCount: number;
	saveCount: number;
}

export interface GenreDTO {
	id: string;
	name: string;
	displayName: string;
}

export interface AlbumTrackDTO {
	albumId: string;
	trackId: string;
	trackNumber: number;
}

export interface StudioStatsDTO {
	totalAlbums: number;
	totalTracks: number;
	publishedTracks: number;
	draftTracks: number;
	subscribersOnly: number;
	totalPlays: number;
	totalLikes: number;
	totalSaves: number;
}

export interface StudioMusicOverviewDTO {
	albums: AlbumDTO[];
	tracks: { track: TrackDTO; stats: TrackStatsDTO | null }[];
	albumTracks: AlbumTrackDTO[];
	genres: GenreDTO[];
	stats: StudioStatsDTO;
}

export type UploadIntent = { fileName: string; contentType: string; size: number };

export function coerceVisibility(value: unknown): Visibility {
	return value === 'subscribers_only' ? 'subscribers_only' : 'public';
}

export function toTrackDTO(track: Track): TrackDTO {
	return {
		id: track.id,
		artistId: track.artistId,
		albumId: track.albumId ?? null,
		title: track.title,
		duration: track.duration ?? null,
		audioKey: track.audioUrl ?? null,
		imageKey: track.imageUrl ?? null,
		genres: track.genre ?? [],
		status: track.status as TrackUploadStatus,
		visibility: coerceVisibility((track as { visibility?: unknown }).visibility),
		isPublished: !!track.isPublished,
		trackNumber: track.trackNumber ?? null,
		createdAt: track.createdAt.toISOString(),
		updatedAt: track.updatedAt.toISOString()
	};
}

export function toAlbumDTO(album: Album): AlbumDTO {
	return {
		id: album.id,
		artistId: album.artistId,
		title: album.title,
		description: album.description ?? null,
		coverImageKey: album.coverImageUrl ?? null,
		releaseDate: album.releaseDate ? album.releaseDate.toISOString() : null,
		genres: album.genres ?? [],
		visibility: coerceVisibility((album as { visibility?: unknown }).visibility),
		isPublished: !!album.isPublished,
		createdAt: album.createdAt.toISOString(),
		updatedAt: album.updatedAt.toISOString()
	};
}

export function toTrackStatsDTO(stats: TrackStats | null): TrackStatsDTO | null {
	if (!stats) return null;
	return {
		playCount: stats.playCount ?? 0,
		likeCount: stats.likeCount ?? 0,
		saveCount: stats.saveCount ?? 0
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/music/dto.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/lib/server/music/dto.ts src/lib/server/music/dto.spec.ts
git commit -m "feat(music): add Music boundary DTOs and mappers (no Drizzle leakage)"
```

---

### Task 8: MusicApplicationService — read side + ownership

**Files:**
- Create: `src/lib/server/music/MusicApplicationService.ts`
- Create: `src/lib/server/music/index.ts`
- Test: `src/lib/server/music/MusicApplicationService.read.spec.ts`

**Interfaces:**
- Consumes: `AlbumService`, `TrackService`, `GenreService`, `AlbumTrackService` from `$lib/db/queries`; DTO mappers from `./dto`.
- Produces:
  - `MusicApplicationService.getStudioOverview(artistId: string): Promise<StudioMusicOverviewDTO>`
  - `MusicApplicationService.assertTrackOwned(artistId, trackId): Promise<Track>` (throws `MusicAccessError` if missing / not owned)
  - `MusicApplicationService.assertAlbumOwned(artistId, albumId): Promise<Album>`
  - `class MusicAccessError extends Error` with `status: 404`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/server/music/MusicApplicationService.read.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	AlbumService: { getAlbumsByArtist: vi.fn(), getAlbumById: vi.fn() },
	TrackService: { getTracksByArtistForStudio: vi.fn(), getTrackById: vi.fn() },
	GenreService: { getAllGenres: vi.fn() },
	AlbumTrackService: { getAlbumTracksByArtist: vi.fn() }
}));

import { AlbumService, TrackService, GenreService, AlbumTrackService } from '$lib/db/queries';
import { MusicApplicationService, MusicAccessError } from './MusicApplicationService';

const d = new Date('2026-06-30T00:00:00Z');
const track = (over = {}) => ({
	id: 't1', albumId: null, artistId: 'a1', title: 'S', duration: 100, audioUrl: null,
	lyrics: null, clipUrl: null, imageUrl: null, trackNumber: null, genre: [],
	status: 'uploaded', isPublished: true, visibility: 'subscribers_only', contentId: null,
	metadata: null, createdAt: d, updatedAt: d, ...over
});

beforeEach(() => vi.clearAllMocks());

describe('getStudioOverview', () => {
	it('aggregates DTOs and computes stats incl. subscribersOnly', async () => {
		(AlbumService.getAlbumsByArtist as any).mockResolvedValue([]);
		(TrackService.getTracksByArtistForStudio as any).mockResolvedValue([
			{ track: track(), stats: { trackId: 't1', playCount: 5, likeCount: 2, saveCount: 1 } }
		]);
		(GenreService.getAllGenres as any).mockResolvedValue([]);
		(AlbumTrackService.getAlbumTracksByArtist as any).mockResolvedValue([]);

		const overview = await MusicApplicationService.getStudioOverview('a1');
		expect(overview.stats.totalTracks).toBe(1);
		expect(overview.stats.subscribersOnly).toBe(1);
		expect(overview.stats.totalPlays).toBe(5);
		expect(overview.tracks[0].track.audioKey).toBeNull();
		expect('metadata' in overview.tracks[0].track).toBe(false);
	});
});

describe('assertTrackOwned', () => {
	it('returns the track when owned', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		await expect(MusicApplicationService.assertTrackOwned('a1', 't1')).resolves.toMatchObject({ id: 't1' });
	});
	it('throws MusicAccessError when not owned', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track({ artistId: 'other' }));
		await expect(MusicApplicationService.assertTrackOwned('a1', 't1')).rejects.toBeInstanceOf(MusicAccessError);
	});
	it('throws MusicAccessError when missing', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(undefined);
		await expect(MusicApplicationService.assertTrackOwned('a1', 't1')).rejects.toBeInstanceOf(MusicAccessError);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/music/MusicApplicationService.read.spec.ts`
Expected: FAIL — cannot resolve `./MusicApplicationService`.

- [ ] **Step 3: Implement the read side + ownership**

```ts
// src/lib/server/music/MusicApplicationService.ts
import {
	AlbumService,
	TrackService,
	GenreService,
	AlbumTrackService
} from '$lib/db/queries';
import type { Track, Album } from '$lib/db';
import {
	toTrackDTO,
	toAlbumDTO,
	toTrackStatsDTO,
	coerceVisibility,
	type StudioMusicOverviewDTO,
	type StudioStatsDTO
} from './dto';

export class MusicAccessError extends Error {
	status = 404 as const;
	constructor(message = 'Not found') {
		super(message);
		this.name = 'MusicAccessError';
	}
}

export class MusicApplicationService {
	static async assertTrackOwned(artistId: string, trackId: string): Promise<Track> {
		const track = await TrackService.getTrackById(trackId);
		if (!track || track.artistId !== artistId) {
			throw new MusicAccessError('Track not found');
		}
		return track;
	}

	static async assertAlbumOwned(artistId: string, albumId: string): Promise<Album> {
		const album = await AlbumService.getAlbumById(albumId);
		if (!album || album.artistId !== artistId) {
			throw new MusicAccessError('Album not found');
		}
		return album;
	}

	static async getStudioOverview(artistId: string): Promise<StudioMusicOverviewDTO> {
		const [albums, tracksResult, genres, albumTracks] = await Promise.all([
			AlbumService.getAlbumsByArtist(artistId),
			TrackService.getTracksByArtistForStudio(artistId),
			GenreService.getAllGenres(),
			AlbumTrackService.getAlbumTracksByArtist(artistId)
		]);

		const tracks = tracksResult.map(({ track, stats }) => ({
			track: toTrackDTO(track),
			stats: toTrackStatsDTO(stats)
		}));

		const stats: StudioStatsDTO = {
			totalAlbums: albums.length,
			totalTracks: tracks.length,
			publishedTracks: tracks.filter((t) => t.track.isPublished).length,
			draftTracks: tracks.filter((t) => !t.track.isPublished).length,
			subscribersOnly: tracks.filter((t) => t.track.visibility === 'subscribers_only').length,
			totalPlays: tracks.reduce((acc, t) => acc + (t.stats?.playCount ?? 0), 0),
			totalLikes: tracks.reduce((acc, t) => acc + (t.stats?.likeCount ?? 0), 0),
			totalSaves: tracks.reduce((acc, t) => acc + (t.stats?.saveCount ?? 0), 0)
		};

		return {
			albums: albums.map(toAlbumDTO),
			tracks,
			albumTracks: albumTracks.map(({ albumTrack }) => ({
				albumId: albumTrack.albumId,
				trackId: albumTrack.trackId,
				trackNumber: albumTrack.trackNumber
			})),
			genres: genres.map((g) => ({ id: g.id, name: g.name, displayName: g.displayName })),
			stats
		};
	}
}
```

```ts
// src/lib/server/music/index.ts
export { MusicApplicationService, MusicAccessError } from './MusicApplicationService';
export * from './dto';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/music/MusicApplicationService.read.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/lib/server/music/MusicApplicationService.ts src/lib/server/music/index.ts src/lib/server/music/MusicApplicationService.read.spec.ts
git commit -m "feat(music): add MusicApplicationService read side + ownership guards"
```

---

### Task 9: Album mutations on the boundary

**Files:**
- Modify: `src/lib/server/music/MusicApplicationService.ts`
- Test: `src/lib/server/music/MusicApplicationService.album.spec.ts`

**Interfaces:**
- Consumes: `AlbumService.createAlbum/updateAlbum/deleteAlbum`, `GenreService.getOrCreateGenres`, `AlbumTrackService.getAlbumTracks`, `TrackService.updateTrack`, `deleteFileFromR2` from `$lib/db/services/R2Service`, `eventPublisher` from `$lib/server/events`.
- Produces:
  - `createAlbum(artistId, input: AlbumMutationInput): Promise<AlbumDTO>`
  - `updateAlbum(artistId, albumId, patch: AlbumPatchInput): Promise<AlbumDTO>` — when `visibility` changes, cascade to linked tracks + emit events.
  - `deleteAlbum(artistId, albumId): Promise<{ ok: true }>` — deletes R2 cover (fixes leak).
  - Types `AlbumMutationInput`, `AlbumPatchInput` (exported from dto.ts).

> Note: cover **upload** stays as-is for now (Plan B moves album cover to presigned). This task only adds metadata+visibility+cleanup, keeping today's `coverImageUrl` handling untouched (the route still passes whatever key/url it has).

- [ ] **Step 1: Add input types to `dto.ts`**

Append to `src/lib/server/music/dto.ts`:

```ts
export interface AlbumMutationInput {
	title: string;
	description?: string | null;
	releaseDate?: Date | null;
	genres?: string[];
	visibility?: Visibility;
	coverImageKey?: string | null;
}

export interface AlbumPatchInput {
	title?: string;
	description?: string | null;
	releaseDate?: Date | null;
	genres?: string[];
	visibility?: Visibility;
	isPublished?: boolean;
	coverImageKey?: string | null;
}
```

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/server/music/MusicApplicationService.album.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	AlbumService: { getAlbumById: vi.fn(), createAlbum: vi.fn(), updateAlbum: vi.fn(), deleteAlbum: vi.fn() },
	TrackService: { updateTrack: vi.fn(), getTrackById: vi.fn() },
	GenreService: { getOrCreateGenres: vi.fn() },
	AlbumTrackService: { getAlbumTracks: vi.fn() }
}));
vi.mock('$lib/db/services/R2Service', () => ({ deleteFileFromR2: vi.fn() }));
vi.mock('$lib/server/events', () => ({ eventPublisher: { publish: vi.fn() } }));

import { AlbumService, TrackService, GenreService, AlbumTrackService } from '$lib/db/queries';
import { deleteFileFromR2 } from '$lib/db/services/R2Service';
import { eventPublisher } from '$lib/server/events';
import { MusicApplicationService } from './MusicApplicationService';

const d = new Date('2026-06-30T00:00:00Z');
const album = (over = {}) => ({
	id: 'al1', artistId: 'a1', title: 'A', description: null, coverImageUrl: null,
	releaseDate: null, price: null, isPublished: false, visibility: 'public',
	genres: [], metadata: null, createdAt: d, updatedAt: d, ...over
});

beforeEach(() => vi.clearAllMocks());

describe('createAlbum', () => {
	it('creates and returns a DTO', async () => {
		(AlbumService.createAlbum as any).mockResolvedValue(album({ title: 'New' }));
		(GenreService.getOrCreateGenres as any).mockResolvedValue([]);
		const dto = await MusicApplicationService.createAlbum('a1', { title: 'New', visibility: 'public' });
		expect(dto.title).toBe('New');
		expect(AlbumService.createAlbum).toHaveBeenCalledWith(
			expect.objectContaining({ artistId: 'a1', visibility: 'public' })
		);
	});
});

describe('updateAlbum visibility cascade', () => {
	it('cascades visibility to linked tracks and emits events', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue(album({ visibility: 'public' }));
		(AlbumService.updateAlbum as any).mockResolvedValue(album({ visibility: 'subscribers_only' }));
		(AlbumTrackService.getAlbumTracks as any).mockResolvedValue([
			{ track: { id: 't1' }, trackNumber: 1 },
			{ track: { id: 't2' }, trackNumber: 2 }
		]);
		(TrackService.updateTrack as any).mockResolvedValue(null);

		await MusicApplicationService.updateAlbum('a1', 'al1', { visibility: 'subscribers_only' });

		expect(TrackService.updateTrack).toHaveBeenCalledWith('t1', { visibility: 'subscribers_only' });
		expect(TrackService.updateTrack).toHaveBeenCalledWith('t2', { visibility: 'subscribers_only' });
		expect(eventPublisher.publish).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'album.visibility_changed', trackIds: ['t1', 't2'] })
		);
	});
	it('does not cascade when visibility is unchanged', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue(album({ visibility: 'public' }));
		(AlbumService.updateAlbum as any).mockResolvedValue(album({ title: 'Renamed', visibility: 'public' }));
		await MusicApplicationService.updateAlbum('a1', 'al1', { title: 'Renamed' });
		expect(AlbumTrackService.getAlbumTracks).not.toHaveBeenCalled();
	});
});

describe('deleteAlbum', () => {
	it('deletes the R2 cover when present then the album', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue(album({ coverImageUrl: 'a1/albums/al1/cover.jpg' }));
		(AlbumService.deleteAlbum as any).mockResolvedValue(true);
		const res = await MusicApplicationService.deleteAlbum('a1', 'al1');
		expect(deleteFileFromR2).toHaveBeenCalledWith({ uniqueKey: 'a1/albums/al1/cover.jpg', bucket: 'images' });
		expect(res).toEqual({ ok: true });
	});
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/music/MusicApplicationService.album.spec.ts`
Expected: FAIL — methods not defined.

- [ ] **Step 4: Implement the album mutations**

Add imports at the top of `MusicApplicationService.ts`:

```ts
import { deleteFileFromR2 } from '$lib/db/services/R2Service';
import { eventPublisher } from '$lib/server/events';
import type { AlbumDTO, AlbumMutationInput, AlbumPatchInput } from './dto';
```

Add methods inside the class:

```ts
	static async createAlbum(artistId: string, input: AlbumMutationInput): Promise<AlbumDTO> {
		const album = await AlbumService.createAlbum({
			artistId,
			title: input.title,
			description: input.description ?? null,
			releaseDate: input.releaseDate ?? null,
			genres: input.genres && input.genres.length > 0 ? input.genres : null,
			coverImageUrl: input.coverImageKey ?? null,
			isPublished: false,
			visibility: coerceVisibility(input.visibility)
		} as Parameters<typeof AlbumService.createAlbum>[0]);
		if (input.genres && input.genres.length > 0) {
			await GenreService.getOrCreateGenres(input.genres);
		}
		return toAlbumDTO(album);
	}

	static async updateAlbum(
		artistId: string,
		albumId: string,
		patch: AlbumPatchInput
	): Promise<AlbumDTO> {
		const existing = await this.assertAlbumOwned(artistId, albumId);
		const existingVisibility = coerceVisibility(
			(existing as { visibility?: unknown }).visibility
		);

		const data: Record<string, unknown> = {};
		if (patch.title !== undefined) data.title = patch.title;
		if (patch.description !== undefined) data.description = patch.description ?? null;
		if (patch.releaseDate !== undefined) data.releaseDate = patch.releaseDate ?? null;
		if (patch.isPublished !== undefined) data.isPublished = patch.isPublished;
		if (patch.coverImageKey !== undefined) data.coverImageUrl = patch.coverImageKey;
		if (patch.genres && patch.genres.length > 0) {
			data.genres = patch.genres;
			await GenreService.getOrCreateGenres(patch.genres);
		}
		const nextVisibility =
			patch.visibility !== undefined ? coerceVisibility(patch.visibility) : existingVisibility;
		if (patch.visibility !== undefined) data.visibility = nextVisibility;

		const updated = await AlbumService.updateAlbum(albumId, data);
		if (!updated) throw new MusicAccessError('Album not found');

		if (nextVisibility !== existingVisibility) {
			const links = await AlbumTrackService.getAlbumTracks(albumId);
			const trackIds = links.map((l) => l.track.id);
			for (const id of trackIds) {
				await TrackService.updateTrack(id, { visibility: nextVisibility });
				await eventPublisher.publish({
					type: 'track.visibility_changed',
					trackId: id,
					artistId,
					visibility: nextVisibility,
					occurredAt: new Date().toISOString()
				});
			}
			await eventPublisher.publish({
				type: 'album.visibility_changed',
				albumId,
				artistId,
				visibility: nextVisibility,
				trackIds,
				occurredAt: new Date().toISOString()
			});
		}

		return toAlbumDTO(updated);
	}

	static async deleteAlbum(artistId: string, albumId: string): Promise<{ ok: true }> {
		const existing = await this.assertAlbumOwned(artistId, albumId);
		if (existing.coverImageUrl) {
			await deleteFileFromR2({ uniqueKey: existing.coverImageUrl, bucket: 'images' });
		}
		const ok = await AlbumService.deleteAlbum(albumId);
		if (!ok) throw new Error('Failed to delete album');
		return { ok: true };
	}
```

> The `visibility` field is passed to `AlbumService.createAlbum`/`updateAlbum`; since `NewAlbum` now includes it (Task 5), the casts keep TS happy where the existing service signatures are loosely typed.

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/music/MusicApplicationService.album.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
yarn format
git add src/lib/server/music/MusicApplicationService.ts src/lib/server/music/dto.ts src/lib/server/music/MusicApplicationService.album.spec.ts
git commit -m "feat(music): album create/update/delete with visibility cascade + cover cleanup"
```

---

### Task 10: Track lifecycle on the boundary (create / resume / finalize)

**Files:**
- Modify: `src/lib/server/music/MusicApplicationService.ts`
- Modify: `src/lib/server/music/dto.ts` (input types)
- Test: `src/lib/server/music/MusicApplicationService.track.spec.ts`

**Interfaces:**
- Consumes: `TrackService.createTrack/updateTrack`, `MediaUploadService` (`createTrackAudioUpload`, `createTrackCoverUpload`, `toStoredTarget`, `renewStoredTarget`, `completeMultipart`, `verifyObject`), `validateAudioUpload`/`validateImageUpload`/`assertPartCount` from `../media/validation`, `R2_MULTIPART_PART_SIZE`, `eventPublisher`.
- Produces:
  - `createTrack(artistId, input: CreateTrackInput): Promise<{ track: TrackDTO; uploadTargets }>` — validates audio/cover, caps part count, persists `pending_upload`, returns presigned targets.
  - `resumeTrackUpload(artistId, trackId): Promise<{ track: TrackDTO; uploadTargets }>`
  - `finalizeTrackUpload(artistId, trackId, input): Promise<{ track: TrackDTO }>` — completes multipart, verifies, sets `uploaded`, emits `track.uploaded`.
  - Type `CreateTrackInput` (title, genres, visibility, duration?, audio: UploadIntent, cover?: UploadIntent) and `TrackUploadMetadata` reused from the route (move the helpers in).

> This is a behavior-preserving move of the existing `createTrack`/`resumeTrackUpload`/`finalizeTrackUpload` route logic into the boundary, plus validation + the `track.uploaded` event. The `uploadTargets` shape returned is the existing `MediaUploadTarget` (already DTO-safe).

- [ ] **Step 1: Add input + metadata types to `dto.ts`**

Append to `src/lib/server/music/dto.ts`:

```ts
import type { StoredUploadTarget } from '$lib/server/media';

export interface CreateTrackInput {
	title: string;
	genres?: string[];
	visibility?: Visibility;
	duration?: number | null;
	audio: UploadIntent;
	cover?: UploadIntent | null;
}

export interface FinalizeTrackInput {
	audioParts: Array<{ partNumber: number; etag: string }>;
	coverUploaded: boolean;
}

export interface TrackUploadMetadata {
	sourceFileName?: string;
	coverFileName?: string | null;
	uploads?: { audio?: StoredUploadTarget; cover?: StoredUploadTarget };
	uploadedAt?: string;
	failedReason?: string;
}
```

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/server/music/MusicApplicationService.track.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	TrackService: { createTrack: vi.fn(), updateTrack: vi.fn(), getTrackById: vi.fn() },
	GenreService: { getOrCreateGenres: vi.fn() },
	AlbumService: {}, AlbumTrackService: {}
}));
vi.mock('$lib/server/media', () => ({
	MediaUploadService: {
		createTrackAudioUpload: vi.fn(),
		createTrackCoverUpload: vi.fn(),
		toStoredTarget: vi.fn((t) => ({ stored: t.key })),
		renewStoredTarget: vi.fn(),
		completeMultipart: vi.fn(),
		verifyObject: vi.fn()
	}
}));
vi.mock('$lib/server/events', () => ({ eventPublisher: { publish: vi.fn() } }));

import { TrackService, GenreService } from '$lib/db/queries';
import { MediaUploadService } from '$lib/server/media';
import { eventPublisher } from '$lib/server/events';
import { MusicApplicationService } from './MusicApplicationService';
import { MAX_AUDIO_SIZE } from '../media/validation';

const d = new Date('2026-06-30T00:00:00Z');
const track = (over = {}) => ({
	id: 't1', albumId: null, artistId: 'a1', title: 'S', duration: 100, audioUrl: 'k',
	lyrics: null, clipUrl: null, imageUrl: null, trackNumber: null, genre: [],
	status: 'pending_upload', isPublished: false, visibility: 'public', contentId: null,
	metadata: { upload: { uploads: { audio: { key: 'a1/tracks/t1/source.mp3', mode: 'single' } } } },
	createdAt: d, updatedAt: d, ...over
});

beforeEach(() => vi.clearAllMocks());

describe('createTrack', () => {
	it('rejects an oversize audio file before creating anything', async () => {
		await expect(
			MusicApplicationService.createTrack('a1', {
				title: 'S', audio: { fileName: 'x.mp3', contentType: 'audio/mpeg', size: MAX_AUDIO_SIZE + 1 }
			})
		).rejects.toThrow();
		expect(TrackService.createTrack).not.toHaveBeenCalled();
	});

	it('creates a pending track and returns upload targets', async () => {
		(TrackService.createTrack as any).mockResolvedValue(track());
		(TrackService.updateTrack as any).mockResolvedValue(track());
		(GenreService.getOrCreateGenres as any).mockResolvedValue([]);
		(MediaUploadService.createTrackAudioUpload as any).mockResolvedValue({ key: 'a1/tracks/t1/source.mp3', target: { mode: 'single' } });

		const result = await MusicApplicationService.createTrack('a1', {
			title: 'S', visibility: 'subscribers_only',
			audio: { fileName: 'x.mp3', contentType: 'audio/mpeg', size: 1024 }
		});

		expect(TrackService.createTrack).toHaveBeenCalledWith(
			expect.objectContaining({ artistId: 'a1', status: 'pending_upload', visibility: 'subscribers_only' })
		);
		expect(result.uploadTargets.audio).toBeDefined();
		expect(result.track.id).toBe('t1');
	});
});

describe('finalizeTrackUpload', () => {
	it('verifies, marks uploaded and emits track.uploaded', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		(MediaUploadService.verifyObject as any).mockResolvedValue({ ok: true });
		(TrackService.updateTrack as any).mockResolvedValue(track({ status: 'uploaded' }));

		const res = await MusicApplicationService.finalizeTrackUpload('a1', 't1', {
			audioParts: [], coverUploaded: false
		});

		expect(TrackService.updateTrack).toHaveBeenCalledWith('t1', expect.objectContaining({ status: 'uploaded' }));
		expect(eventPublisher.publish).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'track.uploaded', trackId: 't1' })
		);
		expect(res.track.status).toBe('uploaded');
	});

	it('marks failed and throws on verify mismatch', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		(MediaUploadService.verifyObject as any).mockResolvedValue({ ok: false, reason: 'size mismatch' });
		(TrackService.updateTrack as any).mockResolvedValue(track({ status: 'failed' }));
		await expect(
			MusicApplicationService.finalizeTrackUpload('a1', 't1', { audioParts: [], coverUploaded: false })
		).rejects.toThrow('size mismatch');
		expect(eventPublisher.publish).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/music/MusicApplicationService.track.spec.ts`
Expected: FAIL — methods not defined.

- [ ] **Step 4: Implement the track lifecycle**

Add imports to `MusicApplicationService.ts`:

```ts
import { MediaUploadService } from '$lib/server/media';
import { R2_MULTIPART_PART_SIZE } from '$lib/db/services/R2Service';
import { validateAudioUpload, validateImageUpload, assertPartCount } from '../media/validation';
import { toTrackDTO } from './dto';
import type { CreateTrackInput, FinalizeTrackInput, TrackUploadMetadata } from './dto';
```

Add private helpers + methods inside the class:

```ts
	private static getUploadMetadata(metadata: unknown): TrackUploadMetadata {
		const record =
			metadata && typeof metadata === 'object' && !Array.isArray(metadata)
				? (metadata as Record<string, unknown>)
				: {};
		const upload = record.upload;
		return (upload && typeof upload === 'object' ? upload : {}) as TrackUploadMetadata;
	}

	private static mergeUploadMetadata(metadata: unknown, upload: TrackUploadMetadata) {
		const base =
			metadata && typeof metadata === 'object' && !Array.isArray(metadata)
				? (metadata as Record<string, unknown>)
				: {};
		return { ...base, upload };
	}

	static async createTrack(artistId: string, input: CreateTrackInput) {
		const audioCheck = validateAudioUpload(input.audio);
		if (!audioCheck.ok) throw new Error(audioCheck.reason);
		assertPartCount(input.audio.size, R2_MULTIPART_PART_SIZE);
		if (input.cover) {
			const coverCheck = validateImageUpload(input.cover);
			if (!coverCheck.ok) throw new Error(coverCheck.reason);
		}

		const genres = input.genres && input.genres.length > 0 ? input.genres : null;
		let track = await TrackService.createTrack({
			artistId,
			title: input.title,
			genre: genres,
			status: 'pending_upload',
			audioUrl: null,
			imageUrl: null,
			duration: input.duration ?? null,
			isPublished: false,
			albumId: null,
			visibility: coerceVisibility(input.visibility)
		} as Parameters<typeof TrackService.createTrack>[0]);

		const audioUpload = await MediaUploadService.createTrackAudioUpload({
			artistId,
			trackId: track.id,
			fileName: input.audio.fileName,
			contentType: input.audio.contentType,
			size: input.audio.size
		});
		const coverUpload = input.cover
			? await MediaUploadService.createTrackCoverUpload({
					artistId,
					trackId: track.id,
					fileName: input.cover.fileName,
					contentType: input.cover.contentType,
					size: input.cover.size
				})
			: null;

		const uploadMetadata: TrackUploadMetadata = {
			sourceFileName: input.audio.fileName,
			coverFileName: input.cover?.fileName ?? null,
			uploads: {
				audio: MediaUploadService.toStoredTarget(audioUpload),
				cover: coverUpload ? MediaUploadService.toStoredTarget(coverUpload) : undefined
			}
		};

		track =
			(await TrackService.updateTrack(track.id, {
				audioUrl: audioUpload.key,
				imageUrl: coverUpload?.key ?? null,
				metadata: this.mergeUploadMetadata(track.metadata, uploadMetadata)
			})) ?? track;

		if (genres) await GenreService.getOrCreateGenres(genres);

		return { track: toTrackDTO(track), uploadTargets: { audio: audioUpload, cover: coverUpload } };
	}

	static async resumeTrackUpload(artistId: string, trackId: string) {
		const track = await this.assertTrackOwned(artistId, trackId);
		const uploadMetadata = this.getUploadMetadata(track.metadata);
		const audio = uploadMetadata.uploads?.audio;
		if (!audio) throw new Error('No pending upload exists for this track');
		return {
			track: toTrackDTO(track),
			uploadTargets: {
				audio: await MediaUploadService.renewStoredTarget(audio),
				cover: uploadMetadata.uploads?.cover
					? await MediaUploadService.renewStoredTarget(uploadMetadata.uploads.cover)
					: null
			}
		};
	}

	static async finalizeTrackUpload(artistId: string, trackId: string, input: FinalizeTrackInput) {
		const track = await this.assertTrackOwned(artistId, trackId);
		const uploadMetadata = this.getUploadMetadata(track.metadata);
		const audio = uploadMetadata.uploads?.audio;
		if (!audio) throw new Error('No audio upload metadata found');

		await MediaUploadService.completeMultipart({ upload: audio, parts: input.audioParts });

		const audioVerification = await MediaUploadService.verifyObject(audio);
		if (!audioVerification.ok) {
			await TrackService.updateTrack(trackId, {
				status: 'failed',
				metadata: this.mergeUploadMetadata(track.metadata, {
					...uploadMetadata,
					failedReason: audioVerification.reason
				})
			});
			throw new Error(audioVerification.reason);
		}

		const cover = uploadMetadata.uploads?.cover;
		if (cover && input.coverUploaded) {
			const coverVerification = await MediaUploadService.verifyObject(cover);
			if (!coverVerification.ok) {
				await TrackService.updateTrack(trackId, {
					status: 'failed',
					metadata: this.mergeUploadMetadata(track.metadata, {
						...uploadMetadata,
						failedReason: coverVerification.reason
					})
				});
				throw new Error(coverVerification.reason);
			}
		}

		const finalized =
			(await TrackService.updateTrack(trackId, {
				status: 'uploaded',
				metadata: this.mergeUploadMetadata(track.metadata, {
					...uploadMetadata,
					uploadedAt: new Date().toISOString(),
					failedReason: undefined
				})
			})) ?? track;

		await eventPublisher.publish({
			type: 'track.uploaded',
			trackId,
			artistId,
			occurredAt: new Date().toISOString()
		});

		return { track: toTrackDTO(finalized) };
	}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/music/MusicApplicationService.track.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
yarn format
git add src/lib/server/music/MusicApplicationService.ts src/lib/server/music/dto.ts src/lib/server/music/MusicApplicationService.track.spec.ts
git commit -m "feat(music): move track create/resume/finalize into boundary + validation + track.uploaded event"
```

---

### Task 11: Track metadata, delete, link/unlink with inheritance

**Files:**
- Modify: `src/lib/server/music/MusicApplicationService.ts`
- Modify: `src/lib/server/music/dto.ts`
- Test: `src/lib/server/music/MusicApplicationService.link.spec.ts`

**Interfaces:**
- Consumes: `TrackService.updateTrack/deleteTrack`, `AlbumTrackService.linkTrackToAlbum/unlinkTrackFromAlbum`, `eventPublisher`.
- Produces:
  - `updateTrackMetadata(artistId, trackId, patch: TrackPatchInput): Promise<TrackDTO>` — emits `track.visibility_changed` / `track.published` when those change.
  - `deleteTrack(artistId, trackId): Promise<{ ok: true }>` — emits `track.deleted`.
  - `linkTrackToAlbum(artistId, albumId, trackId, trackNumber): Promise<AlbumTrackDTO>` — inherits album visibility onto the track + emits `track.visibility_changed` if it changed.
  - `unlinkTrackFromAlbum(artistId, albumId, trackId): Promise<{ ok: true }>` — no visibility revert.
  - Type `TrackPatchInput`.

- [ ] **Step 1: Add `TrackPatchInput` to `dto.ts`**

Append to `src/lib/server/music/dto.ts`:

```ts
export interface TrackPatchInput {
	title?: string;
	genres?: string[];
	visibility?: Visibility;
	isPublished?: boolean;
	duration?: number | null;
}
```

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/server/music/MusicApplicationService.link.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	TrackService: { getTrackById: vi.fn(), updateTrack: vi.fn(), deleteTrack: vi.fn() },
	AlbumService: { getAlbumById: vi.fn() },
	AlbumTrackService: { linkTrackToAlbum: vi.fn(), unlinkTrackFromAlbum: vi.fn() },
	GenreService: { getOrCreateGenres: vi.fn() }
}));
vi.mock('$lib/server/events', () => ({ eventPublisher: { publish: vi.fn() } }));

import { TrackService, AlbumService, AlbumTrackService } from '$lib/db/queries';
import { eventPublisher } from '$lib/server/events';
import { MusicApplicationService } from './MusicApplicationService';

const d = new Date('2026-06-30T00:00:00Z');
const track = (over = {}) => ({
	id: 't1', albumId: null, artistId: 'a1', title: 'S', duration: 100, audioUrl: null,
	lyrics: null, clipUrl: null, imageUrl: null, trackNumber: null, genre: [],
	status: 'uploaded', isPublished: false, visibility: 'public', contentId: null,
	metadata: null, createdAt: d, updatedAt: d, ...over
});
const album = (over = {}) => ({ ...track(), id: 'al1', coverImageUrl: null, releaseDate: null, price: null, genres: [], description: null, ...over });

beforeEach(() => vi.clearAllMocks());

describe('linkTrackToAlbum inheritance', () => {
	it('overwrites track visibility with the album visibility and emits', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue(album({ visibility: 'subscribers_only' }));
		(TrackService.getTrackById as any).mockResolvedValue(track({ visibility: 'public' }));
		(AlbumTrackService.linkTrackToAlbum as any).mockResolvedValue({ albumId: 'al1', trackId: 't1', trackNumber: 1 });
		(TrackService.updateTrack as any).mockResolvedValue(track({ visibility: 'subscribers_only' }));

		const res = await MusicApplicationService.linkTrackToAlbum('a1', 'al1', 't1', 1);
		expect(TrackService.updateTrack).toHaveBeenCalledWith('t1', { visibility: 'subscribers_only' });
		expect(eventPublisher.publish).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'track.visibility_changed', visibility: 'subscribers_only' })
		);
		expect(res).toEqual({ albumId: 'al1', trackId: 't1', trackNumber: 1 });
	});
	it('does not emit when album visibility matches the track', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue(album({ visibility: 'public' }));
		(TrackService.getTrackById as any).mockResolvedValue(track({ visibility: 'public' }));
		(AlbumTrackService.linkTrackToAlbum as any).mockResolvedValue({ albumId: 'al1', trackId: 't1', trackNumber: 1 });
		await MusicApplicationService.linkTrackToAlbum('a1', 'al1', 't1', 1);
		expect(eventPublisher.publish).not.toHaveBeenCalled();
	});
});

describe('updateTrackMetadata', () => {
	it('emits track.visibility_changed and track.published when both change', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track({ visibility: 'public', isPublished: false }));
		(TrackService.updateTrack as any).mockResolvedValue(track({ visibility: 'subscribers_only', isPublished: true }));
		await MusicApplicationService.updateTrackMetadata('a1', 't1', { visibility: 'subscribers_only', isPublished: true });
		expect(eventPublisher.publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'track.visibility_changed' }));
		expect(eventPublisher.publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'track.published' }));
	});
});

describe('deleteTrack', () => {
	it('deletes and emits track.deleted', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		(TrackService.deleteTrack as any).mockResolvedValue(true);
		const res = await MusicApplicationService.deleteTrack('a1', 't1');
		expect(res).toEqual({ ok: true });
		expect(eventPublisher.publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'track.deleted' }));
	});
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/music/MusicApplicationService.link.spec.ts`
Expected: FAIL — methods not defined.

- [ ] **Step 4: Implement**

Add `import type { TrackPatchInput, AlbumTrackDTO } from './dto';` to the existing dto import line, then add methods inside the class:

```ts
	static async updateTrackMetadata(artistId: string, trackId: string, patch: TrackPatchInput) {
		const existing = await this.assertTrackOwned(artistId, trackId);
		const prevVisibility = coerceVisibility((existing as { visibility?: unknown }).visibility);
		const prevPublished = !!existing.isPublished;

		const data: Record<string, unknown> = {};
		if (patch.title !== undefined) data.title = patch.title;
		if (patch.duration !== undefined) data.duration = patch.duration;
		if (patch.isPublished !== undefined) data.isPublished = patch.isPublished;
		if (patch.genres && patch.genres.length > 0) {
			data.genre = patch.genres;
			await GenreService.getOrCreateGenres(patch.genres);
		}
		const nextVisibility =
			patch.visibility !== undefined ? coerceVisibility(patch.visibility) : prevVisibility;
		if (patch.visibility !== undefined) data.visibility = nextVisibility;

		const updated = await TrackService.updateTrack(trackId, data);
		if (!updated) throw new MusicAccessError('Track not found');

		if (nextVisibility !== prevVisibility) {
			await eventPublisher.publish({
				type: 'track.visibility_changed',
				trackId,
				artistId,
				visibility: nextVisibility,
				occurredAt: new Date().toISOString()
			});
		}
		if (patch.isPublished === true && !prevPublished) {
			await eventPublisher.publish({
				type: 'track.published',
				trackId,
				artistId,
				occurredAt: new Date().toISOString()
			});
		}
		return toTrackDTO(updated);
	}

	static async deleteTrack(artistId: string, trackId: string): Promise<{ ok: true }> {
		await this.assertTrackOwned(artistId, trackId);
		const ok = await TrackService.deleteTrack(trackId);
		if (!ok) throw new Error('Failed to delete track');
		await eventPublisher.publish({
			type: 'track.deleted',
			trackId,
			artistId,
			occurredAt: new Date().toISOString()
		});
		return { ok: true };
	}

	static async linkTrackToAlbum(
		artistId: string,
		albumId: string,
		trackId: string,
		trackNumber: number
	): Promise<AlbumTrackDTO> {
		const album = await this.assertAlbumOwned(artistId, albumId);
		const track = await this.assertTrackOwned(artistId, trackId);
		const albumVisibility = coerceVisibility((album as { visibility?: unknown }).visibility);
		const trackVisibility = coerceVisibility((track as { visibility?: unknown }).visibility);

		const link = await AlbumTrackService.linkTrackToAlbum(albumId, trackId, trackNumber);

		if (albumVisibility !== trackVisibility) {
			await TrackService.updateTrack(trackId, { visibility: albumVisibility });
			await eventPublisher.publish({
				type: 'track.visibility_changed',
				trackId,
				artistId,
				visibility: albumVisibility,
				occurredAt: new Date().toISOString()
			});
		}

		return { albumId: link.albumId, trackId: link.trackId, trackNumber: link.trackNumber };
	}

	static async unlinkTrackFromAlbum(
		artistId: string,
		albumId: string,
		trackId: string
	): Promise<{ ok: true }> {
		await this.assertAlbumOwned(artistId, albumId);
		await this.assertTrackOwned(artistId, trackId);
		const ok = await AlbumTrackService.unlinkTrackFromAlbum(albumId, trackId);
		if (!ok) throw new Error('Failed to unlink track from album');
		return { ok: true };
	}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/music/MusicApplicationService.link.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
yarn format
git add src/lib/server/music/MusicApplicationService.ts src/lib/server/music/dto.ts src/lib/server/music/MusicApplicationService.link.spec.ts
git commit -m "feat(music): track metadata/delete + link inheritance with visibility events"
```

---

### Task 12: Refactor route actions to the boundary + secure the upload-target endpoint

**Files:**
- Modify: `src/routes/studio/music/+page.server.ts` (all actions + `load`)
- Modify: `src/routes/api/studio/media/upload-target/+server.ts` (origin check + rate limit)
- Create: `src/lib/server/security/origin.ts`
- Test: `src/lib/server/security/origin.spec.ts`

**Interfaces:**
- Consumes: `MusicApplicationService`, `MusicAccessError` from `$lib/server/music`; `createRateLimiter` from `$lib/server/security/rateLimiter`.
- Produces: `isSameOrigin(event): boolean` (compares `request.headers.get('origin')` to `event.url.origin`, allowing missing origin only for `Sec-Fetch-Site: same-origin`).

> This task removes `$lib/db/queries` and `$lib/server/upload` imports from the music route and routes every action through the boundary. `updateTrack`'s file-upload branches are deferred to Plan B — for now `updateTrack` maps to `updateTrackMetadata` only (metadata/visibility/publish), which matches the redesigned UI (file replacement becomes a presigned flow in Plan B). The legacy album-cover/track-audio server upload is therefore no longer reachable from music; confirm with a grep that `$lib/server/upload` has no other music importers.

- [ ] **Step 1: Write the failing origin test**

```ts
// src/lib/server/security/origin.spec.ts
import { describe, it, expect } from 'vitest';
import { isSameOrigin } from './origin';

function evt(headers: Record<string, string>, origin = 'https://app.test') {
	return { request: { headers: new Headers(headers) }, url: new URL(origin) } as any;
}

describe('isSameOrigin', () => {
	it('accepts a matching origin header', () => {
		expect(isSameOrigin(evt({ origin: 'https://app.test' }))).toBe(true);
	});
	it('rejects a mismatched origin header', () => {
		expect(isSameOrigin(evt({ origin: 'https://evil.test' }))).toBe(false);
	});
	it('accepts a missing origin when Sec-Fetch-Site is same-origin', () => {
		expect(isSameOrigin(evt({ 'sec-fetch-site': 'same-origin' }))).toBe(true);
	});
	it('rejects a missing origin with no same-origin signal', () => {
		expect(isSameOrigin(evt({}))).toBe(false);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/security/origin.spec.ts`
Expected: FAIL — cannot resolve `./origin`.

- [ ] **Step 3: Implement `isSameOrigin`**

```ts
// src/lib/server/security/origin.ts
import type { RequestEvent } from '@sveltejs/kit';

export function isSameOrigin(event: Pick<RequestEvent, 'request' | 'url'>): boolean {
	const origin = event.request.headers.get('origin');
	if (origin) return origin === event.url.origin;
	return event.request.headers.get('sec-fetch-site') === 'same-origin';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/security/origin.spec.ts`
Expected: PASS.

- [ ] **Step 5: Harden the upload-target endpoint**

In `src/routes/api/studio/media/upload-target/+server.ts`, add imports and guards at the top of `POST` after the artist check:

```ts
import { isSameOrigin } from '$lib/server/security/origin';
import { createRateLimiter } from '$lib/server/security/rateLimiter';

const uploadTargetLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
```

Then immediately after `if (!artist) return json({ error: 'Unauthorized' }, { status: 401 });`:

```ts
	if (!isSameOrigin(event)) return json({ error: 'Forbidden' }, { status: 403 });
	if (!uploadTargetLimiter.check(artist.id)) {
		return json({ error: 'Too many requests' }, { status: 429 });
	}
```

- [ ] **Step 6: Refactor the music route `load`**

Replace the body of `load` in `src/routes/studio/music/+page.server.ts` with a single boundary call:

```ts
export const load: PageServerLoad = async ({ parent }) => {
	const { artist } = await parent();
	if (!artist) throw error(401, 'Unauthorized');
	try {
		return await MusicApplicationService.getStudioOverview(artist.id);
	} catch (err) {
		console.error('Failed to load studio music data:', err);
		throw error(500, 'Failed to load music data');
	}
};
```

> The returned shape changes from `{ albums, tracks, albumTracks, genres, stats }` (rows) to DTOs with the **same property names** but `audioKey`/`imageKey`/`coverImageKey` instead of `audioUrl`/`imageUrl`/`coverImageUrl`. The current `StudioMusicPage.svelte` still reads `track.imageUrl`/`album.coverImageUrl`; Plan C rewrites the UI. To keep the page rendering until then, **add a temporary compatibility shim** in `load` only if Plan C is not executed immediately (map `imageKey`→`imageUrl`, `coverImageKey`→`coverImageUrl`, `audioKey`→`audioUrl`). Otherwise proceed to Plan C next.

- [ ] **Step 7: Refactor every action to the boundary**

Replace each action in `+page.server.ts` with a thin wrapper. Add a shared rate limiter + helper at the top of the actions:

```ts
import { MusicApplicationService, MusicAccessError } from '$lib/server/music';
import { createRateLimiter } from '$lib/server/security/rateLimiter';
import { isSameOrigin } from '$lib/server/security/origin';

const createTrackLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

function fromError(err: unknown) {
	if (err instanceof MusicAccessError) return fail(404, { error: err.message });
	const message = err instanceof Error ? err.message : 'Request failed';
	return fail(400, { error: message });
}
```

Then, for example, `createTrack` becomes:

```ts
	createTrack: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });
		if (!isSameOrigin(event)) return fail(403, { error: 'Forbidden' });
		if (!createTrackLimiter.check(artist.id)) return fail(429, { error: 'Too many requests' });
		try {
			const data = await event.request.formData();
			const metaJson = data.get('metadata') as string | null;
			const meta = metaJson ? JSON.parse(metaJson) : null;
			const title = ((data.get('title') as string) || meta?.title || '').trim();
			if (!title) return fail(400, { error: 'Title is required' });

			const cover_title = data.get('cover_title') as string | null;
			const cover_type = data.get('cover_type') as string | null;
			const cover_size = Number(data.get('cover_size') ?? 0);

			const result = await MusicApplicationService.createTrack(artist.id, {
				title,
				genres: normalizeGenres(data.get('genres') as string),
				visibility: (data.get('visibility') as string) === 'subscribers_only' ? 'subscribers_only' : 'public',
				duration: meta?.duration ?? null,
				audio: {
					fileName: data.get('file_name') as string,
					contentType: data.get('type') as string,
					size: Number(data.get('file_size') ?? 0)
				},
				cover:
					cover_title && cover_type && cover_size > 0
						? { fileName: cover_title, contentType: cover_type, size: cover_size }
						: null
			});
			return { success: true, ...result };
		} catch (err) {
			return fromError(err);
		}
	},
```

Apply the same thin-wrapper pattern to `createAlbum`, `updateAlbum`, `deleteAlbum`, `resumeTrackUpload`, `finalizeTrackUpload`, `updateTrack` (→ `updateTrackMetadata`), `deleteTrack`, `linkTrackToAlbum`, `unlinkTrackFromAlbum`, mapping FormData fields to the boundary inputs defined in Tasks 8–11. Keep `normalizeGenres` as a local helper. **Remove** the imports `AlbumService, TrackService, GenreService, AlbumTrackService` from `$lib/db/queries`, all imports from `$lib/server/upload`, `MediaUploadService`/`StoredUploadTarget` direct usage, and the dead `getUploadRelativePath`/`normalizeUploadUrl`/`getUploadMetadata`/`mergeUploadMetadata`/`parseUploadParts`/`asRecord` helpers now living in the boundary. Keep `parseUploadParts` ONLY if `finalizeTrackUpload` still parses `audioParts` from FormData here — move it inline:

```ts
	finalizeTrackUpload: async (event) => {
		const artist = await getArtistByCookie(event);
		if (!artist) return fail(401, { error: 'Unauthorized' });
		try {
			const data = await event.request.formData();
			const trackId = data.get('trackId') as string;
			const raw = data.get('audioParts');
			const audioParts =
				typeof raw === 'string' && raw.trim()
					? (JSON.parse(raw) as Array<{ partNumber: number; etag: string }>).filter(
							(p) => Number.isInteger(p.partNumber) && p.partNumber > 0 && p.etag
						)
					: [];
			const result = await MusicApplicationService.finalizeTrackUpload(artist.id, trackId, {
				audioParts,
				coverUploaded: data.get('coverUploaded') === 'true'
			});
			return { success: true, ...result };
		} catch (err) {
			return fromError(err);
		}
	},
```

- [ ] **Step 8: Confirm no other importers of the legacy upload module remain for music**

Run: `git grep -n "server/upload" -- src/routes/studio/music`
Expected: no matches. (If non-music importers exist elsewhere, leave `$lib/server/upload.ts` in place — Plan B handles its full retirement.)

- [ ] **Step 9: Type-check + lint + run all unit tests**

Run: `yarn check && yarn lint && yarn test:unit -- --run`
Expected: no type/lint errors in changed files; all server specs pass.

- [ ] **Step 10: Commit**

```bash
yarn format
git add src/routes/studio/music/+page.server.ts src/routes/api/studio/media/upload-target/+server.ts src/lib/server/security/origin.ts src/lib/server/security/origin.spec.ts
git commit -m "refactor(studio): route music actions through MusicApplicationService + origin/rate-limit guards"
```

---

### Task 13: Coverage gate verification

**Files:**
- (none — verification only)

- [ ] **Step 1: Run the coverage gate**

Run: `yarn test:coverage`
Expected: PASS with **lines/branches/functions/statements ≥ 90%** for `src/lib/server/music/**`, `src/lib/server/events/**`, `src/lib/server/media/validation.ts`, `src/lib/server/security/**`. If any file is below 90%, the run fails and prints the uncovered lines.

- [ ] **Step 2: Close gaps (if any)**

For each uncovered branch the report names, add a focused test to the matching `*.spec.ts` (e.g. an unhandled error path, a `null` return from a DB service, an unknown-visibility coercion). Re-run `yarn test:coverage` until green. Do not lower the thresholds.

- [ ] **Step 3: Commit any added tests**

```bash
yarn format
git add src/lib/server/
git commit -m "test(music): close coverage gaps to satisfy the 90% seam gate"
```

---

## Self-Review

**Spec coverage (Plan A = §9 phases 1–5 of the spec):**
- §6.1 IDOR/ownership → Tasks 8–11 (`assertTrackOwned`/`assertAlbumOwned` on every mutation) + Task 12 (origin guard). ✓
- §6.2 audio/image MIME+size + partCount cap → Tasks 2, 3, used in Task 10. ✓
- §6.3 rate limiting (in-memory) → Tasks 4, 12. ✓
- §6.4 origin check on JSON endpoint → Task 12. ✓
- §4 schema visibility + content_id + inheritance semantics → Task 5 (columns), Tasks 9/11 (cascade, inherit-on-link, no-revert-on-unlink). ✓
- §3.2 Music boundary + DTOs (no Drizzle leakage) → Tasks 7–11. ✓
- §3.3 EventPublisher + LogEventPublisher + emissions → Tasks 6, 9, 10, 11. ✓
- §10.1 TDD + ≥90% gate → every task is test-first; Tasks 1, 13. ✓
- **Deferred to later plans (correctly out of Plan A):** album-cover/track-audio presigned unification + retire `upload.ts` (Plan B / §6.6 cleanup), UI redesign (Plan C / §5), observability counters (Plan D / §8), listener-side enforcement (separate branch / §6.4). Flagged in Task 12 Step 6 (UI compat shim) and Task 12 note.

**Placeholder scan:** no TBD/TODO; every code step shows complete code; commands have expected output. ✓

**Type consistency:** `MusicApplicationService` method names (`getStudioOverview`, `assertTrackOwned`, `assertAlbumOwned`, `createAlbum`, `updateAlbum`, `deleteAlbum`, `createTrack`, `resumeTrackUpload`, `finalizeTrackUpload`, `updateTrackMetadata`, `deleteTrack`, `linkTrackToAlbum`, `unlinkTrackFromAlbum`) are consistent across Tasks 7–12. DTO names (`TrackDTO`, `AlbumDTO`, `AlbumTrackDTO`, `CreateTrackInput`, `FinalizeTrackInput`, `AlbumMutationInput`, `AlbumPatchInput`, `TrackPatchInput`, `UploadIntent`, `TrackUploadMetadata`) consistent between dto.ts and consumers. `coerceVisibility`/`toTrackDTO`/`toAlbumDTO`/`toTrackStatsDTO` consistent. ✓
