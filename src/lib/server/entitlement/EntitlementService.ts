import { SubscriptionService } from '$lib/db/services/SubscriptionService';
import { ArtistService } from '$lib/db/queries';
import { isSeededUnclaimed } from '$lib/utils/seeded-artist';

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
		const artist = await ArtistService.getArtistById(artistId);
		// Free only while the page has no owner. A claimed seeded artist is a real
		// account again — a new subscriber is subscribing to them, same as any other.
		const kind = artist && isSeededUnclaimed(artist) ? 'pre_claim_free' : 'paid';
		await SubscriptionService.subscribe(userId, artistId, kind);
	}

	static async unsubscribe(userId: string, artistId: string): Promise<void> {
		await SubscriptionService.unsubscribe(userId, artistId);
	}
}
