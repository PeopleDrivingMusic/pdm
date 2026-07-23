import { describe, it, expect, vi, beforeEach } from 'vitest';

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
import { GET } from './+server';

const track = (over = {}) => ({
	id: 't1',
	artistId: 'a1',
	audioUrl: 'a1/audio/t1.mp3',
	status: 'ready',
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

it('403s a subscribers_only track for an anonymous viewer', async () => {
	(TrackService.getTrackById as any).mockResolvedValue(track({ visibility: 'subscribers_only' }));
	const res = await call({ user: null });
	expect(res.status).toBe(403);
	expect(EntitlementService.isSubscriberOf).not.toHaveBeenCalled();
});

it('403s a subscribers_only track for a non-subscriber', async () => {
	(TrackService.getTrackById as any).mockResolvedValue(track({ visibility: 'subscribers_only' }));
	(EntitlementService.isSubscriberOf as any).mockResolvedValue(false);
	const res = await call({ user: { id: 'u2' } });
	expect(res.status).toBe(403);
});

it('streams a subscribers_only track to an active subscriber', async () => {
	(TrackService.getTrackById as any).mockResolvedValue(track({ visibility: 'subscribers_only' }));
	(EntitlementService.isSubscriberOf as any).mockResolvedValue(true);
	const res = await call({ user: { id: 'u2' } });
	expect(res.status).toBe(200);
});

it('streams a subscribers_only track to its owner without checking entitlement', async () => {
	(TrackService.getTrackById as any).mockResolvedValue(track({ visibility: 'subscribers_only' }));
	const res = await call({ user: { id: 'owner1' } });
	expect(res.status).toBe(200);
	expect(EntitlementService.isSubscriberOf).not.toHaveBeenCalled();
});
