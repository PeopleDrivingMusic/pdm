import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/services/SubscriptionService', () => ({
	SubscriptionService: {
		isSubscriber: vi.fn(),
		listActiveArtistIds: vi.fn(),
		subscribe: vi.fn(),
		unsubscribe: vi.fn()
	}
}));

import { SubscriptionService } from '$lib/db/services/SubscriptionService';
import { EntitlementService } from './EntitlementService';

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
	});
});

describe('subscribe/unsubscribe', () => {
	it('subscribe delegates to SubscriptionService', async () => {
		await EntitlementService.subscribe('u1', 'a1');
		expect(SubscriptionService.subscribe).toHaveBeenCalledWith('u1', 'a1');
	});

	it('unsubscribe delegates to SubscriptionService', async () => {
		await EntitlementService.unsubscribe('u1', 'a1');
		expect(SubscriptionService.unsubscribe).toHaveBeenCalledWith('u1', 'a1');
	});
});
