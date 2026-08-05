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

	// Missing-space-after-period typos are common on mobile and contain NO link —
	// they must not be blocked (the rule only restricts non-owner fans).
	it('passes a missing-space typo before a capitalized word', () =>
		expect(containsUrl('this is amazing.Keep it up')).toBe(false));
	it('passes another missing-space typo', () =>
		expect(containsUrl('that was fire.Absolutely loved it')).toBe(false));
	it('passes a lowercase project name with a dot', () =>
		expect(containsUrl('Node.js is great and so is this')).toBe(false));
	it('passes an emphatic dotted phrase', () =>
		expect(containsUrl('this is the best.EP.ever')).toBe(false));

	// Real links must still be caught.
	it('detects a bare common-TLD domain', () =>
		expect(containsUrl('go to scam.com for free stuff')).toBe(true));
	it('detects a shortened link with a path', () =>
		expect(containsUrl('here bit.ly/abc123 grab it')).toBe(true));
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
