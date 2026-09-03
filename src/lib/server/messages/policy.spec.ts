import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	ArtistService: { getArtistById: vi.fn() },
	TrackService: { getTrackById: vi.fn() }
}));
vi.mock('$lib/db', () => ({ db: {} }));
vi.mock('$lib/db/schema', () => ({ posts: {} }));

import { ArtistService, TrackService } from '$lib/db/queries';
import { containsUrl, resolveTargetOwnerUserId, resolveArtistRoomContext } from './policy';

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

	// The original TLD list was missing several TLDs that are trivial to abuse —
	// a bare, no-scheme domain on one of these sailed through undetected.
	it('detects a bare .co domain', () => expect(containsUrl('hit me up at scamhype.co')).toBe(true));
	it('detects a bare .me domain', () =>
		expect(containsUrl('dm me on grabit.me for the drop')).toBe(true));
	it('detects a bare .to domain', () =>
		expect(containsUrl('link in bio: freebeats.to')).toBe(true));

	// Widening the TLD list must not reintroduce the typo false-positive: the same
	// "missing space after a period" shape, just landing on one of the new entries.
	it('still passes a capitalized typo landing on a newly added TLD', () =>
		expect(containsUrl('shoutout.To the whole crew')).toBe(false));
	it('still passes another capitalized typo on a newly added TLD', () =>
		expect(containsUrl('love this.Co design though')).toBe(false));

	// A rejected (capitalized) candidate earlier in the message must not hide a real,
	// lowercase link later in the same message.
	it('still finds a real link after a capitalized false candidate', () =>
		expect(containsUrl('shoutout.To the crew, also check grabit.me for the drop')).toBe(true));

	// Independent review caught a regression in the fix above: rejecting on *any*
	// uppercase (not just the Title-case typo shape) let an all-caps domain — a
	// real, common spam style — through undetected.
	it('detects an ALL-CAPS domain', () => expect(containsUrl('visit scam.COM now')).toBe(true));
	it('detects an ALL-CAPS domain on a newly added TLD', () =>
		expect(containsUrl('DM me on GRABIT.ME for the drop')).toBe(true));
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

// Owner and origin in ONE artist read. Resolving them separately would double the query
// on the hottest path in the chat room for no gain — both come off the same row.
describe('resolveArtistRoomContext', () => {
	it('reports the owner and a native origin', async () => {
		(ArtistService.getArtistById as any).mockResolvedValue({
			id: 'a1',
			userId: 'owner1',
			origin: 'native'
		});
		expect(await resolveArtistRoomContext('a1')).toEqual({
			ownerUserId: 'owner1',
			isSeeded: false
		});
	});

	it('reports an imported artist as seeded and ownerless', async () => {
		(ArtistService.getArtistById as any).mockResolvedValue({
			id: 'a1',
			userId: null,
			origin: 'audius'
		});
		expect(await resolveArtistRoomContext('a1')).toEqual({ ownerUserId: null, isSeeded: true });
	});

	it('closes the free read once the page is claimed, even though origin stays audius', async () => {
		// Claiming sets `user_id` and `claimed_at`; `origin` stays `audius` forever
		// (a fact about the data, not the account), but the room now has a real owner
		// and real subscribers, so the open-to-everyone read must end here.
		(ArtistService.getArtistById as any).mockResolvedValue({
			id: 'a1',
			userId: 'claimer1',
			origin: 'audius',
			claimedAt: new Date()
		});
		expect(await resolveArtistRoomContext('a1')).toEqual({
			ownerUserId: 'claimer1',
			isSeeded: false
		});
	});

	it('reads the artist exactly once', async () => {
		(ArtistService.getArtistById as any).mockResolvedValue({
			id: 'a1',
			userId: null,
			origin: 'audius'
		});
		await resolveArtistRoomContext('a1');
		expect(ArtistService.getArtistById).toHaveBeenCalledTimes(1);
	});

	it('treats a missing artist as ownerless and not seeded', async () => {
		// Fail closed: an unknown id must not open a chat room.
		(ArtistService.getArtistById as any).mockResolvedValue(undefined);
		expect(await resolveArtistRoomContext('nope')).toEqual({
			ownerUserId: null,
			isSeeded: false
		});
	});
});
