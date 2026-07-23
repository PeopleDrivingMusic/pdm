import { SubscriptionService } from '$lib/db/services/SubscriptionService';

/**
 * Application boundary for subscription entitlement. Returns only primitives —
 * no Drizzle rows leak across this seam, so the DB layer can later become a
 * remote Entitlement service.
 */
export class EntitlementService {
	static async isSubscriberOf(
		userId: string | null | undefined,
		artistId: string
	): Promise<boolean> {
		if (!userId) return false;
		return SubscriptionService.isSubscriber(userId, artistId);
	}

	static async getSubscribedArtistIds(userId: string | null | undefined): Promise<string[]> {
		if (!userId) return [];
		return SubscriptionService.listActiveArtistIds(userId);
	}

	static async subscribe(userId: string, artistId: string): Promise<void> {
		await SubscriptionService.subscribe(userId, artistId);
	}

	static async unsubscribe(userId: string, artistId: string): Promise<void> {
		await SubscriptionService.unsubscribe(userId, artistId);
	}
}
