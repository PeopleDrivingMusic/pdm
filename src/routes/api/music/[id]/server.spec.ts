import { it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	TrackService: { getTrackById: vi.fn() },
	ArtistService: { getArtistById: vi.fn() }
}));
vi.mock('$lib/server/entitlement', () => ({
	EntitlementService: { isSubscriberOf: vi.fn() }
}));
vi.mock('$lib/db/services/R2Service', () => ({
	getFileUrlFromR2: vi.fn().mockResolvedValue({ streamUrl: 'https://r2/stream' })
}));

import { TrackService, ArtistService } from '$lib/db/queries';
import { EntitlementService } from '$lib/server/entitlement';
import { getFileUrlFromR2 } from '$lib/db/services/R2Service';
import { GET } from './+server';

const track = (over = {}) => ({
	id: 't1',
	artistId: 'a1',
	audioUrl: 'a1/audio/t1.mp3',
	status: 'ready',
	isPublished: true,
	visibility: 'public',
	...over
});

const call = (locals = {}) => (GET as any)({ params: { id: 't1' }, locals });

beforeEach(() => {
	vi.clearAllMocks();
	(ArtistService.getArtistById as any).mockResolvedValue({ id: 'a1', userId: 'owner1' });
});

it('streams a public track to anyone', async () => {
	(TrackService.getTrackById as any).mockResolvedValue(track());
	const res = await call({ user: null });
	expect(res.status).toBe(200);
});

it('403s a subscribers track for an anonymous viewer', async () => {
	(TrackService.getTrackById as any).mockResolvedValue(track({ visibility: 'subscribers' }));
	const res = await call({ user: null });
	expect(res.status).toBe(403);
	expect(EntitlementService.isSubscriberOf).not.toHaveBeenCalled();
});

it('403s a subscribers track for a non-subscriber', async () => {
	(TrackService.getTrackById as any).mockResolvedValue(track({ visibility: 'subscribers' }));
	(EntitlementService.isSubscriberOf as any).mockResolvedValue(false);
	const res = await call({ user: { id: 'u2' } });
	expect(res.status).toBe(403);
});

it('streams a subscribers track to an active subscriber', async () => {
	(TrackService.getTrackById as any).mockResolvedValue(track({ visibility: 'subscribers' }));
	(EntitlementService.isSubscriberOf as any).mockResolvedValue(true);
	const res = await call({ user: { id: 'u2' } });
	expect(res.status).toBe(200);
});

it('streams a subscribers track to its owner without checking entitlement', async () => {
	(TrackService.getTrackById as any).mockResolvedValue(track({ visibility: 'subscribers' }));
	const res = await call({ user: { id: 'owner1' } });
	expect(res.status).toBe(200);
	expect(EntitlementService.isSubscriberOf).not.toHaveBeenCalled();
});

// Seeded tracks are streamed by the source, not stored in our bucket. `audio_url`
// then holds the source's own stable stream endpoint rather than an R2 object key,
// so presigning it would produce a signed URL for an object that does not exist.
it('returns the stored URL for a source-hosted track without presigning', async () => {
	(TrackService.getTrackById as any).mockResolvedValue(
		track({ audioSource: 'audius', audioUrl: 'https://api.audius.co/v1/tracks/7YmNr/stream' })
	);
	const res = await call({ user: null });
	expect(res.status).toBe(200);
	await expect(res.json()).resolves.toEqual({
		src: 'https://api.audius.co/v1/tracks/7YmNr/stream'
	});
	expect(getFileUrlFromR2).not.toHaveBeenCalled();
});

it('presigns an r2 track', async () => {
	(TrackService.getTrackById as any).mockResolvedValue(track({ audioSource: 'r2' }));
	const res = await call({ user: null });
	await expect(res.json()).resolves.toEqual({ src: 'https://r2/stream' });
	expect(getFileUrlFromR2).toHaveBeenCalled();
});

it('presigns when the column is absent, matching the schema default', async () => {
	(TrackService.getTrackById as any).mockResolvedValue(track());
	await call({ user: null });
	expect(getFileUrlFromR2).toHaveBeenCalled();
});

it('does not let a source-hosted track skip the subscriber gate', async () => {
	// The branch sits below the entitlement check today. This pins that ordering: a
	// gated track must 403 before its source URL is ever handed out.
	(TrackService.getTrackById as any).mockResolvedValue(
		track({ audioSource: 'audius', visibility: 'subscribers' })
	);
	const res = await call({ user: null });
	expect(res.status).toBe(403);
});

// The endpoint has its own hand-rolled gate instead of `resolveTargetAccess`, and that
// gate never looked at `is_published` — it did not matter while every unpublished track
// was also an R2 object we presigned into a broken URL. A source-hosted track has a real,
// working URL, so the missing check became the difference between dormant and live.
it('404s an unpublished track', async () => {
	(TrackService.getTrackById as any).mockResolvedValue(track({ isPublished: false }));
	const res = await call({ user: null });
	expect(res.status).toBe(404);
});

it('404s an unpublished source-hosted track — the shape an import actually writes', async () => {
	// CatalogImportRepository writes exactly this: ready, public, NOT published.
	(TrackService.getTrackById as any).mockResolvedValue(
		track({
			audioSource: 'audius',
			audioUrl: 'https://api.audius.co/v1/tracks/7YmNr/stream',
			isPublished: false
		})
	);
	const res = await call({ user: null });
	expect(res.status).toBe(404);
});

it('404s rather than handing out a stored URL that is not https', async () => {
	(TrackService.getTrackById as any).mockResolvedValue(
		track({ audioSource: 'audius', audioUrl: 'javascript:alert(1)' })
	);
	const res = await call({ user: null });
	expect(res.status).toBe(404);
});
