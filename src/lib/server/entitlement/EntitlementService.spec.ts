import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/services/SubscriptionService', () => ({
	SubscriptionService: {
		isSubscriber: vi.fn(),
		listActiveArtistIds: vi.fn(),
		subscribe: vi.fn(),
		unsubscribe: vi.fn()
	}
}));
vi.mock('$lib/db/queries', () => ({
	ArtistService: { getArtistById: vi.fn() }
}));

import { SubscriptionService } from '$lib/db/services/SubscriptionService';
import { ArtistService } from '$lib/db/queries';
import { EntitlementService } from './EntitlementService';

const artist = (over = {}) => ({ id: 'a1', origin: 'native', claimedAt: null, ...over });

beforeEach(() => vi.clearAllMocks());

describe('isSubscriberOf', () => {
	it('returns false for an anonymous viewer without querying the DB', async () => {
		const result = await EntitlementService.isSubscriberOf(null, 'a1');
		expect(result).toBe(false);
		expect(SubscriptionService.isSubscriber).not.toHaveBeenCalled();
	});

	it('delegates to SubscriptionService for a logged-in viewer', async () => {
		(SubscriptionService.isSubscriber as any).mockResolvedValue(true);
		const result = await EntitlementService.isSubscriberOf('u1', 'a1');
		expect(result).toBe(true);
		expect(SubscriptionService.isSubscriber).toHaveBeenCalledWith('u1', 'a1');
	});
});

describe('getSubscribedArtistIds', () => {
	it('returns [] for anonymous without querying', async () => {
		const result = await EntitlementService.getSubscribedArtistIds(undefined);
		expect(result).toEqual([]);
		expect(SubscriptionService.listActiveArtistIds).not.toHaveBeenCalled();
	});

	it('returns the ids from SubscriptionService for a logged-in viewer', async () => {
		(SubscriptionService.listActiveArtistIds as any).mockResolvedValue(['a1', 'a2']);
		const result = await EntitlementService.getSubscribedArtistIds('u1');
		expect(result).toEqual(['a1', 'a2']);
		expect(SubscriptionService.listActiveArtistIds).toHaveBeenCalledWith('u1');
	});
});

describe('subscribe — kind derived from the artist, not the caller', () => {
	it('a native artist gets a paid subscription', async () => {
		vi.mocked(ArtistService.getArtistById).mockResolvedValue(artist({ origin: 'native' }) as never);
		await EntitlementService.subscribe('u1', 'a1');
		expect(SubscriptionService.subscribe).toHaveBeenCalledWith('u1', 'a1', 'paid');
	});

	it('an unclaimed seeded artist gets a free pre-claim subscription', async () => {
		vi.mocked(ArtistService.getArtistById).mockResolvedValue(
			artist({ origin: 'audius', claimedAt: null }) as never
		);
		await EntitlementService.subscribe('u1', 'a1');
		expect(SubscriptionService.subscribe).toHaveBeenCalledWith('u1', 'a1', 'pre_claim_free');
	});

	// Once claimed, the page has a real owner again — a new subscriber is subscribing
	// to them, not pledging to an empty page, so the free pre-claim carve-out ends.
	it('a claimed seeded artist gets a paid subscription, same as native', async () => {
		vi.mocked(ArtistService.getArtistById).mockResolvedValue(
			artist({ origin: 'audius', claimedAt: new Date() }) as never
		);
		await EntitlementService.subscribe('u1', 'a1');
		expect(SubscriptionService.subscribe).toHaveBeenCalledWith('u1', 'a1', 'paid');
	});

	it('falls back to paid if the artist lookup comes back empty', async () => {
		vi.mocked(ArtistService.getArtistById).mockResolvedValue(undefined);
		await EntitlementService.subscribe('u1', 'a1');
		expect(SubscriptionService.subscribe).toHaveBeenCalledWith('u1', 'a1', 'paid');
	});
});

describe('unsubscribe', () => {
	it('delegates to SubscriptionService', async () => {
		await EntitlementService.unsubscribe('u1', 'a1');
		expect(SubscriptionService.unsubscribe).toHaveBeenCalledWith('u1', 'a1');
	});
});
