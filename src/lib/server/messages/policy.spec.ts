import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	ArtistService: { getArtistById: vi.fn() },
	TrackService: { getTrackById: vi.fn() }
}));
vi.mock('$lib/db', () => ({ db: {} }));
vi.mock('$lib/db/schema', () => ({ posts: {} }));

import { ArtistService, TrackService } from '$lib/db/queries';
import { containsUrl, resolveTargetOwnerUserId } from './policy';

beforeEach(() => vi.clearAllMocks());

describe('containsUrl', () => {
	it('detects an http(s) url', () =>
		expect(containsUrl('check https://evil.test/x out')).toBe(true));
	it('detects a bare www domain', () => expect(containsUrl('go to www.evil.test now')).toBe(true));
	it('detects a bare domain with a path', () =>
		expect(containsUrl('evil.test/promo is great')).toBe(true));
	it('passes plain prose', () =>
		expect(containsUrl('this track absolutely slaps, well done')).toBe(false));
	it('passes emoji + text', () => expect(containsUrl('🔥🔥 love this 🎸')).toBe(false));
});

describe('resolveTargetOwnerUserId', () => {
	it('resolves an artist target directly to its userId', async () => {
		(ArtistService.getArtistById as any).mockResolvedValue({ id: 'a1', userId: 'owner1' });
		expect(await resolveTargetOwnerUserId('artist', 'a1')).toBe('owner1');
	});

	it('resolves a track target through its artist', async () => {
		(TrackService.getTrackById as any).mockResolvedValue({ id: 't1', artistId: 'a1' });
		(ArtistService.getArtistById as any).mockResolvedValue({ id: 'a1', userId: 'owner1' });
		expect(await resolveTargetOwnerUserId('track', 't1')).toBe('owner1');
	});

	it('returns null for a missing track', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(undefined);
		expect(await resolveTargetOwnerUserId('track', 'nope')).toBeNull();
	});

	it('returns null for a missing artist', async () => {
		(ArtistService.getArtistById as any).mockResolvedValue(undefined);
		expect(await resolveTargetOwnerUserId('artist', 'nope')).toBeNull();
	});
});
