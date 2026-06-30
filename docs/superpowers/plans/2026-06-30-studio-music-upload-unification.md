# Studio Music Upload — Unification (Plan B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move album-cover and track audio/image *replacement* uploads off the legacy server-buffered path onto direct-to-R2 presigned targets, with ownership-checked, validated, server-derived keys — eliminating music's dependency on `$lib/server/upload.ts`.

**Architecture:** Adds an `album-cover` kind to `MediaUploadService`, three new `MusicApplicationService` methods that issue presigned targets (ownership + validation enforced), and extends the `upload-target` JSON endpoint to serve those kinds. The legacy `uploadImage`/`uploadAudio` (through-server) path is no longer reachable from music; `upload.ts` remains only for the content route.

**Tech Stack:** SvelteKit 2, TypeScript, Drizzle, Cloudflare R2 (S3 SDK), vitest.

**Depends on:** Plan A (the `MusicApplicationService`, `validation.ts`, `origin.ts`, `rateLimiter.ts`, and `visibility` schema must exist).

## Global Constraints

- **TDD, test-first**; boundary additions stay within the **≥90% coverage** gate (`yarn test:coverage`).
- **Server-derived keys only.** The R2 key is built from the verified record (`artistId`/`albumId`/`trackId`), never from client-supplied keys.
- **Ownership enforced** before issuing any presigned target (`assertAlbumOwned`/`assertTrackOwned`).
- **Validation before presign:** `validateImageUpload` / `validateAudioUpload` + `assertPartCount` (from Plan A).
- No Drizzle types cross the boundary; methods return DTOs + `MediaUploadTarget` (already DTO-safe).
- `$lib/server/upload.ts` **must not be deleted** (still imported by `src/routes/studio/content/+page.server.ts`). Only music's use is removed (done in Plan A).
- Indentation tabs; `yarn format` before each commit.

---

### Task 1: `album-cover` media kind

**Files:**
- Modify: `src/lib/server/media/MediaUploadService.ts`
- Test: `src/lib/server/media/MediaUploadService.spec.ts`

**Interfaces:**
- Produces: `MediaUploadKind` gains `'album-cover'`; `MediaUploadService.createAlbumCoverUpload({ artistId, albumId, fileName, contentType, size }): Promise<MediaUploadTarget>` with key `${artistId}/albums/${albumId}/cover<ext>` in the `images` bucket, single PUT.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/server/media/MediaUploadService.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/services/R2Service', () => ({
	createPresignedPutUrl: vi.fn(async (i) => ({ mode: 'single', bucket: i.bucket, key: i.key, url: 'https://r2/put', expiresIn: 900 })),
	createMultipartUpload: vi.fn(),
	signMultipartParts: vi.fn(),
	completeMultipartUpload: vi.fn(),
	headR2Object: vi.fn(),
	R2_MULTIPART_PART_SIZE: 8 * 1024 * 1024
}));

import { MediaUploadService } from './MediaUploadService';

beforeEach(() => vi.clearAllMocks());

describe('createAlbumCoverUpload', () => {
	it('derives an artist/album-namespaced key in the images bucket', async () => {
		const target = await MediaUploadService.createAlbumCoverUpload({
			artistId: 'a1', albumId: 'al1', fileName: 'My Cover.PNG', contentType: 'image/png', size: 2048
		});
		expect(target.kind).toBe('album-cover');
		expect(target.bucket).toBe('images');
		expect(target.key).toBe('a1/albums/al1/cover.png');
		expect(target.target.mode).toBe('single');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/media/MediaUploadService.spec.ts`
Expected: FAIL — `createAlbumCoverUpload` is not a function.

- [ ] **Step 3: Implement**

In `src/lib/server/media/MediaUploadService.ts`, extend the kind type (line ~11):

```ts
export type MediaUploadKind = 'track-audio' | 'track-cover' | 'album-cover' | 'content-photo';
```

Add a key helper next to `trackCoverKey`:

```ts
function albumCoverKey(input: { artistId: string; albumId: string; fileName: string }) {
	return `${input.artistId}/albums/${input.albumId}/cover${getExtension(input.fileName, '.jpg')}`;
}
```

Add a method to the class:

```ts
	static async createAlbumCoverUpload(input: {
		artistId: string;
		albumId: string;
		fileName: string;
		contentType: string;
		size: number;
	}) {
		return createTarget({
			kind: 'album-cover',
			bucket: 'images',
			key: albumCoverKey(input),
			contentType: input.contentType || 'image/jpeg',
			size: input.size,
			allowMultipart: false
		});
	}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/media/MediaUploadService.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/lib/server/media/MediaUploadService.ts src/lib/server/media/MediaUploadService.spec.ts
git commit -m "feat(media): add album-cover presigned upload kind"
```

---

### Task 2: Boundary — `createAlbumCover` (presigned album cover)

**Files:**
- Modify: `src/lib/server/music/MusicApplicationService.ts`
- Test: `src/lib/server/music/MusicApplicationService.cover.spec.ts`

**Interfaces:**
- Consumes: `MediaUploadService.createAlbumCoverUpload`, `validateImageUpload`, `deleteFileFromR2`, `AlbumService.updateAlbum`.
- Produces: `createAlbumCover(artistId, albumId, intent: UploadIntent): Promise<{ album: AlbumDTO; uploadTarget: MediaUploadTarget }>` — validates, deletes previous cover, issues target, stores the new key on the album.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/server/music/MusicApplicationService.cover.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	AlbumService: { getAlbumById: vi.fn(), updateAlbum: vi.fn() },
	TrackService: { getTrackById: vi.fn(), updateTrack: vi.fn() },
	GenreService: {}, AlbumTrackService: {}
}));
vi.mock('$lib/db/services/R2Service', () => ({ deleteFileFromR2: vi.fn(), R2_MULTIPART_PART_SIZE: 8 * 1024 * 1024 }));
vi.mock('$lib/server/media', () => ({
	MediaUploadService: { createAlbumCoverUpload: vi.fn(), createTrackCoverUpload: vi.fn(), createTrackAudioUpload: vi.fn(), toStoredTarget: vi.fn((t) => ({ stored: t.key })) }
}));
vi.mock('$lib/server/events', () => ({ eventPublisher: { publish: vi.fn() } }));

import { AlbumService } from '$lib/db/queries';
import { deleteFileFromR2 } from '$lib/db/services/R2Service';
import { MediaUploadService } from '$lib/server/media';
import { MusicApplicationService } from './MusicApplicationService';

const d = new Date('2026-06-30T00:00:00Z');
const album = (over = {}) => ({ id: 'al1', artistId: 'a1', title: 'A', description: null, coverImageUrl: null, releaseDate: null, price: null, isPublished: false, visibility: 'public', genres: [], metadata: null, createdAt: d, updatedAt: d, ...over });

beforeEach(() => vi.clearAllMocks());

describe('createAlbumCover', () => {
	it('validates, deletes old cover, issues a target and stores the key', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue(album({ coverImageUrl: 'a1/albums/al1/cover.jpg' }));
		(MediaUploadService.createAlbumCoverUpload as any).mockResolvedValue({ key: 'a1/albums/al1/cover.png', bucket: 'images', target: { mode: 'single' } });
		(AlbumService.updateAlbum as any).mockResolvedValue(album({ coverImageUrl: 'a1/albums/al1/cover.png' }));

		const res = await MusicApplicationService.createAlbumCover('a1', 'al1', { fileName: 'c.png', contentType: 'image/png', size: 2048 });
		expect(deleteFileFromR2).toHaveBeenCalledWith({ uniqueKey: 'a1/albums/al1/cover.jpg', bucket: 'images' });
		expect(AlbumService.updateAlbum).toHaveBeenCalledWith('al1', { coverImageUrl: 'a1/albums/al1/cover.png' });
		expect(res.uploadTarget.key).toBe('a1/albums/al1/cover.png');
		expect(res.album.coverImageKey).toBe('a1/albums/al1/cover.png');
	});

	it('rejects a non-image before issuing a target', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue(album());
		await expect(
			MusicApplicationService.createAlbumCover('a1', 'al1', { fileName: 'c.gif', contentType: 'image/gif', size: 2048 })
		).rejects.toThrow();
		expect(MediaUploadService.createAlbumCoverUpload).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/music/MusicApplicationService.cover.spec.ts`
Expected: FAIL — `createAlbumCover` not defined.

- [ ] **Step 3: Implement**

Add to `MusicApplicationService.ts` (the validation/media imports already exist from Plan A; add `MediaUploadTarget` type import):

```ts
import type { MediaUploadTarget } from '$lib/server/media';
```

Add the method:

```ts
	static async createAlbumCover(artistId: string, albumId: string, intent: UploadIntent) {
		const album = await this.assertAlbumOwned(artistId, albumId);
		const check = validateImageUpload(intent);
		if (!check.ok) throw new Error(check.reason);

		if (album.coverImageUrl) {
			await deleteFileFromR2({ uniqueKey: album.coverImageUrl, bucket: 'images' });
		}
		const uploadTarget: MediaUploadTarget = await MediaUploadService.createAlbumCoverUpload({
			artistId,
			albumId,
			fileName: intent.fileName,
			contentType: intent.contentType,
			size: intent.size
		});
		const updated = await AlbumService.updateAlbum(albumId, { coverImageUrl: uploadTarget.key });
		if (!updated) throw new MusicAccessError('Album not found');
		return { album: toAlbumDTO(updated), uploadTarget };
	}
```

Add `UploadIntent` to the existing dto type import if not already present.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/music/MusicApplicationService.cover.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/lib/server/music/MusicApplicationService.ts src/lib/server/music/MusicApplicationService.cover.spec.ts
git commit -m "feat(music): presigned album cover upload via boundary (ownership + validation)"
```

---

### Task 3: Boundary — `replaceTrackImage` + `replaceTrackAudio`

**Files:**
- Modify: `src/lib/server/music/MusicApplicationService.ts`
- Test: `src/lib/server/music/MusicApplicationService.replace.spec.ts`

**Interfaces:**
- Produces:
  - `replaceTrackImage(artistId, trackId, intent): Promise<{ track: TrackDTO; uploadTarget }>` — validates image, issues track-cover target, stores `imageUrl`.
  - `replaceTrackAudio(artistId, trackId, intent): Promise<{ track: TrackDTO; uploadTargets }>` — validates audio + part cap, issues track-audio target, sets `status='pending_upload'` and stores upload metadata (re-uses the existing `finalizeTrackUpload` to complete).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/server/music/MusicApplicationService.replace.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	TrackService: { getTrackById: vi.fn(), updateTrack: vi.fn() },
	AlbumService: {}, GenreService: {}, AlbumTrackService: {}
}));
vi.mock('$lib/db/services/R2Service', () => ({ deleteFileFromR2: vi.fn(), R2_MULTIPART_PART_SIZE: 8 * 1024 * 1024 }));
vi.mock('$lib/server/media', () => ({
	MediaUploadService: {
		createTrackCoverUpload: vi.fn(async () => ({ key: 'a1/tracks/t1/cover.jpg', target: { mode: 'single' } })),
		createTrackAudioUpload: vi.fn(async () => ({ key: 'a1/tracks/t1/source.mp3', target: { mode: 'single' } })),
		toStoredTarget: vi.fn((t) => ({ key: t.key, mode: 'single' }))
	}
}));
vi.mock('$lib/server/events', () => ({ eventPublisher: { publish: vi.fn() } }));

import { TrackService } from '$lib/db/queries';
import { MediaUploadService } from '$lib/server/media';
import { MusicApplicationService } from './MusicApplicationService';

const d = new Date('2026-06-30T00:00:00Z');
const track = (over = {}) => ({ id: 't1', albumId: null, artistId: 'a1', title: 'S', duration: 100, audioUrl: 'k', lyrics: null, clipUrl: null, imageUrl: null, trackNumber: null, genre: [], status: 'uploaded', isPublished: true, visibility: 'public', contentId: null, metadata: null, createdAt: d, updatedAt: d, ...over });

beforeEach(() => vi.clearAllMocks());

describe('replaceTrackImage', () => {
	it('stores the new image key and returns the target', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		(TrackService.updateTrack as any).mockResolvedValue(track({ imageUrl: 'a1/tracks/t1/cover.jpg' }));
		const res = await MusicApplicationService.replaceTrackImage('a1', 't1', { fileName: 'c.jpg', contentType: 'image/jpeg', size: 1024 });
		expect(TrackService.updateTrack).toHaveBeenCalledWith('t1', { imageUrl: 'a1/tracks/t1/cover.jpg' });
		expect(res.uploadTarget.key).toBe('a1/tracks/t1/cover.jpg');
	});
});

describe('replaceTrackAudio', () => {
	it('sets pending_upload + metadata and returns audio target', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		(TrackService.updateTrack as any).mockResolvedValue(track({ status: 'pending_upload' }));
		const res = await MusicApplicationService.replaceTrackAudio('a1', 't1', { fileName: 's.mp3', contentType: 'audio/mpeg', size: 1024 });
		expect(TrackService.updateTrack).toHaveBeenCalledWith('t1', expect.objectContaining({ status: 'pending_upload', audioUrl: 'a1/tracks/t1/source.mp3' }));
		expect(res.uploadTargets.audio).toBeDefined();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/music/MusicApplicationService.replace.spec.ts`
Expected: FAIL — methods not defined.

- [ ] **Step 3: Implement**

Add to `MusicApplicationService.ts`:

```ts
	static async replaceTrackImage(artistId: string, trackId: string, intent: UploadIntent) {
		await this.assertTrackOwned(artistId, trackId);
		const check = validateImageUpload(intent);
		if (!check.ok) throw new Error(check.reason);
		const uploadTarget = await MediaUploadService.createTrackCoverUpload({
			artistId, trackId, fileName: intent.fileName, contentType: intent.contentType, size: intent.size
		});
		const updated = await TrackService.updateTrack(trackId, { imageUrl: uploadTarget.key });
		if (!updated) throw new MusicAccessError('Track not found');
		return { track: toTrackDTO(updated), uploadTarget };
	}

	static async replaceTrackAudio(artistId: string, trackId: string, intent: UploadIntent) {
		const track = await this.assertTrackOwned(artistId, trackId);
		const check = validateAudioUpload(intent);
		if (!check.ok) throw new Error(check.reason);
		assertPartCount(intent.size, R2_MULTIPART_PART_SIZE);

		const audioUpload = await MediaUploadService.createTrackAudioUpload({
			artistId, trackId, fileName: intent.fileName, contentType: intent.contentType, size: intent.size
		});
		const uploadMetadata = this.getUploadMetadata(track.metadata);
		const updated = await TrackService.updateTrack(trackId, {
			status: 'pending_upload',
			audioUrl: audioUpload.key,
			metadata: this.mergeUploadMetadata(track.metadata, {
				...uploadMetadata,
				sourceFileName: intent.fileName,
				uploads: { ...uploadMetadata.uploads, audio: MediaUploadService.toStoredTarget(audioUpload) }
			})
		});
		if (!updated) throw new MusicAccessError('Track not found');
		return { track: toTrackDTO(updated), uploadTargets: { audio: audioUpload, cover: null } };
	}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/music/MusicApplicationService.replace.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
yarn format
git add src/lib/server/music/MusicApplicationService.ts src/lib/server/music/MusicApplicationService.replace.spec.ts
git commit -m "feat(music): presigned track audio/image replacement via boundary"
```

---

### Task 4: Extend the `upload-target` endpoint with ownership-checked kinds

**Files:**
- Modify: `src/routes/api/studio/media/upload-target/+server.ts`
- Test: `e2e/upload-target.spec.ts` (integration-level via Playwright request context) — OR a vitest server spec if the endpoint logic is extracted. This task extracts a pure handler for testability.
- Create: `src/lib/server/media/uploadTargetHandler.ts`
- Test: `src/lib/server/media/uploadTargetHandler.spec.ts`

**Interfaces:**
- Produces: `resolveUploadTarget(artistId, body): Promise<{ upload: MediaUploadTarget } | { error: string; status: number }>` — dispatches by `kind`, enforces ownership for album/track kinds via the boundary, validates, returns the target or a typed error. The `+server.ts` POST becomes a thin caller (auth + origin + rate-limit from Plan A, then `resolveUploadTarget`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/server/media/uploadTargetHandler.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/music', () => ({
	MusicApplicationService: { createAlbumCover: vi.fn(), replaceTrackImage: vi.fn(), replaceTrackAudio: vi.fn() }
}));
vi.mock('$lib/server/media', () => ({
	MediaUploadService: { createContentPhotoUpload: vi.fn(async () => ({ kind: 'content-photo', key: 'k' })) }
}));

import { MusicApplicationService } from '$lib/server/music';
import { resolveUploadTarget } from './uploadTargetHandler';

beforeEach(() => vi.clearAllMocks());

describe('resolveUploadTarget', () => {
	it('rejects an unknown kind', async () => {
		const res = await resolveUploadTarget('a1', { kind: 'nope' });
		expect(res).toMatchObject({ status: 400 });
	});
	it('requires albumId for album-cover', async () => {
		const res = await resolveUploadTarget('a1', { kind: 'album-cover', fileName: 'c.png', contentType: 'image/png', size: 10 });
		expect(res).toMatchObject({ status: 400 });
	});
	it('delegates album-cover to the boundary (ownership inside)', async () => {
		(MusicApplicationService.createAlbumCover as any).mockResolvedValue({ uploadTarget: { kind: 'album-cover', key: 'a1/albums/al1/cover.png' } });
		const res = await resolveUploadTarget('a1', { kind: 'album-cover', albumId: 'al1', fileName: 'c.png', contentType: 'image/png', size: 10 });
		expect(MusicApplicationService.createAlbumCover).toHaveBeenCalledWith('a1', 'al1', expect.any(Object));
		expect((res as any).upload.key).toBe('a1/albums/al1/cover.png');
	});
	it('maps a boundary 404 to a typed error', async () => {
		const err: any = new Error('Album not found'); err.status = 404;
		(MusicApplicationService.createAlbumCover as any).mockRejectedValue(err);
		const res = await resolveUploadTarget('a1', { kind: 'album-cover', albumId: 'x', fileName: 'c.png', contentType: 'image/png', size: 10 });
		expect(res).toMatchObject({ status: 404 });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit -- --run src/lib/server/media/uploadTargetHandler.spec.ts`
Expected: FAIL — cannot resolve `./uploadTargetHandler`.

- [ ] **Step 3: Implement the handler**

```ts
// src/lib/server/media/uploadTargetHandler.ts
import { MusicApplicationService } from '$lib/server/music';
import { MediaUploadService } from './index';

type Body = Record<string, unknown>;
type Ok = { upload: unknown };
type Err = { error: string; status: number };

function intent(body: Body) {
	return {
		fileName: typeof body.fileName === 'string' ? body.fileName : '',
		contentType: typeof body.contentType === 'string' ? body.contentType : '',
		size: typeof body.size === 'number' ? body.size : Number(body.size ?? 0)
	};
}

export async function resolveUploadTarget(artistId: string, body: Body): Promise<Ok | Err> {
	const kind = typeof body.kind === 'string' ? body.kind : '';
	const i = intent(body);
	if (!i.fileName || !i.contentType || !Number.isFinite(i.size) || i.size <= 0) {
		return { error: 'File metadata is required', status: 400 };
	}
	try {
		switch (kind) {
			case 'content-photo':
				return { upload: await MediaUploadService.createContentPhotoUpload({ artistId, ...i }) };
			case 'album-cover': {
				const albumId = typeof body.albumId === 'string' ? body.albumId : '';
				if (!albumId) return { error: 'albumId is required', status: 400 };
				const { uploadTarget } = await MusicApplicationService.createAlbumCover(artistId, albumId, i);
				return { upload: uploadTarget };
			}
			case 'track-cover': {
				const trackId = typeof body.trackId === 'string' ? body.trackId : '';
				if (!trackId) return { error: 'trackId is required', status: 400 };
				const { uploadTarget } = await MusicApplicationService.replaceTrackImage(artistId, trackId, i);
				return { upload: uploadTarget };
			}
			case 'track-audio': {
				const trackId = typeof body.trackId === 'string' ? body.trackId : '';
				if (!trackId) return { error: 'trackId is required', status: 400 };
				const { uploadTargets } = await MusicApplicationService.replaceTrackAudio(artistId, trackId, i);
				return { upload: uploadTargets.audio };
			}
			default:
				return { error: 'Unsupported upload kind', status: 400 };
		}
	} catch (err) {
		const status = (err as { status?: number }).status ?? 400;
		return { error: err instanceof Error ? err.message : 'Upload could not be prepared', status };
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit -- --run src/lib/server/media/uploadTargetHandler.spec.ts`
Expected: PASS.

- [ ] **Step 5: Wire the endpoint to the handler**

Replace the body of `POST` in `src/routes/api/studio/media/upload-target/+server.ts` (keeping the Plan A auth/origin/rate-limit guards) with:

```ts
	const body = await event.request.json().catch(() => null);
	if (!body || typeof body !== 'object') return json({ error: 'Invalid body' }, { status: 400 });
	const result = await resolveUploadTarget(artist.id, body as Record<string, unknown>);
	if ('error' in result) return json({ error: result.error }, { status: result.status });
	return json(result);
```

Add the import: `import { resolveUploadTarget } from '$lib/server/media/uploadTargetHandler';` and remove the now-unused `IMAGE_TYPES`/`MAX_IMAGE_SIZE`/`MediaUploadService` direct usage (validation now lives in the boundary/handler).

- [ ] **Step 6: Type-check + coverage**

Run: `yarn check && yarn test:coverage`
Expected: no type errors; coverage gate stays ≥90% (the new `uploadTargetHandler.ts` is under `src/lib/server/media/**` — note Plan A's coverage `include` lists `validation.ts` specifically; **add `'src/lib/server/media/uploadTargetHandler.ts'` to the coverage `include` array in `vite.config.ts`** so it's gated).

- [ ] **Step 7: Commit**

```bash
yarn format
git add src/lib/server/media/uploadTargetHandler.ts src/lib/server/media/uploadTargetHandler.spec.ts src/routes/api/studio/media/upload-target/+server.ts vite.config.ts
git commit -m "feat(media): ownership-checked upload-target dispatch for album/track kinds"
```

---

### Task 5: Confirm music no longer depends on the legacy upload path

**Files:** (verification + cleanup only)

- [ ] **Step 1: Grep for legacy importers under music**

Run: `git grep -n "server/upload" -- src/routes/studio/music src/lib/server/music`
Expected: **no matches.** (`src/routes/studio/content/+page.server.ts` may still import it — that is fine and out of scope.)

- [ ] **Step 2: Grep for through-server R2 in the music boundary**

Run: `git grep -n "putFileToR2\|uploadAudio\|uploadImage" -- src/lib/server/music src/routes/studio/music`
Expected: **no matches** — all music uploads are presigned direct-to-R2.

- [ ] **Step 3: Full check**

Run: `yarn check && yarn lint && yarn test:unit -- --run`
Expected: clean.

- [ ] **Step 4: Commit (if any lint/format fixes)**

```bash
yarn format
git add -A
git commit -m "chore(music): confirm legacy through-server upload path removed from music"
```

---

## Self-Review

**Spec coverage (Plan B = spec phase 6 + §6.6 cover cleanup):**
- `createAlbumCoverUpload` media kind → Task 1. ✓
- Album cover + track audio/image edits move to presigned → Tasks 2, 3. ✓
- `upload-target` endpoint extended with kinds + ownership + validation (IDOR fix realized at the endpoint) → Task 4. ✓
- Album-cover R2 cleanup on replace → Task 2 (delete previous). Delete-on-album-delete already in Plan A Task 9. ✓
- Remove music's dependency on `$lib/server/upload.ts`, keep it for content → Task 5 (verification; removal happened in Plan A). ✓
- Residual: client-side wiring of album-cover/track-replace presigned PUT lives in Plan C (UI). Flagged.

**Placeholder scan:** no TBD/TODO; complete code in every step. ✓

**Type consistency:** new boundary methods `createAlbumCover`, `replaceTrackImage`, `replaceTrackAudio` and `MediaUploadService.createAlbumCoverUpload` referenced identically in tests, handler, and impl. `resolveUploadTarget(artistId, body)` signature consistent between handler and endpoint. ✓
