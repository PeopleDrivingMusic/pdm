import { and, eq } from 'drizzle-orm';
import { db, withDbLogging } from '../index';
import { subscriptions } from '../schema';

export class SubscriptionService {
	static async isSubscriber(userId: string, artistId: string): Promise<boolean> {
		return withDbLogging('SubscriptionService.isSubscriber', async () => {
			const rows = await db
				.select({ id: subscriptions.id })
				.from(subscriptions)
				.where(
					and(
						eq(subscriptions.userId, userId),
						eq(subscriptions.artistId, artistId),
						eq(subscriptions.status, 'active')
					)
				)
				.limit(1);
			return rows.length > 0;
		});
	}

	static async listActiveArtistIds(userId: string): Promise<string[]> {
		return withDbLogging('SubscriptionService.listActiveArtistIds', async () => {
			const rows = await db
				.select({ artistId: subscriptions.artistId })
				.from(subscriptions)
				.where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')));
			return rows.map((r) => r.artistId);
		});
	}

	static async subscribe(userId: string, artistId: string): Promise<void> {
		await withDbLogging('SubscriptionService.subscribe', async () => {
			await db
				.insert(subscriptions)
				.values({ userId, artistId, status: 'active', startedAt: new Date(), canceledAt: null })
				.onConflictDoUpdate({
					target: [subscriptions.userId, subscriptions.artistId],
					set: { status: 'active', startedAt: new Date(), canceledAt: null }
				});
		});
	}

	static async unsubscribe(userId: string, artistId: string): Promise<void> {
		await withDbLogging('SubscriptionService.unsubscribe', async () => {
			await db
				.update(subscriptions)
				.set({ status: 'canceled', canceledAt: new Date() })
				.where(and(eq(subscriptions.userId, userId), eq(subscriptions.artistId, artistId)));
		});
	}
}
