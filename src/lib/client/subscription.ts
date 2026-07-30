import { invalidateAll } from '$app/navigation';

export type SubscriptionResult = { ok: true } | { ok: false; error: string };

const ENDPOINT = (artistId: string) => `/api/artist/${artistId}/subscription`;

async function setSubscription(
	artistId: string,
	method: 'POST' | 'DELETE',
	failMessage: string
): Promise<SubscriptionResult> {
	try {
		const response = await fetch(ENDPOINT(artistId), { method });
		if (!response.ok) return { ok: false, error: failMessage };
		// Refresh load data so entitlement-derived UI (locked tracks, gated posts, CTA) updates.
		await invalidateAll();
		return { ok: true };
	} catch {
		return { ok: false, error: failMessage };
	}
}

/** Subscribe the current user to an artist, then refresh page data. */
export function subscribeToArtist(artistId: string): Promise<SubscriptionResult> {
	return setSubscription(artistId, 'POST', 'Could not subscribe. Please try again.');
}

/** Cancel the current user's subscription to an artist, then refresh page data. */
export function unsubscribeFromArtist(artistId: string): Promise<SubscriptionResult> {
	return setSubscription(artistId, 'DELETE', 'Could not update your subscription.');
}
