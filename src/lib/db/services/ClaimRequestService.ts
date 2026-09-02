import { db, withDbLogging } from '$lib/db';
import { artistClaimRequests } from '$lib/db/schema';

export type CreateClaimRequestResult = { ok: true } | { ok: false; reason: 'already_requested' };

/**
 * Request-only, per the design spec: no verification, no handover. The unique
 * (artist, user) index is the only de-duplication — a repeat submission is a no-op,
 * not a second row for the same person waiting on the same page.
 */
export class ClaimRequestService {
	static async create(input: {
		artistId: string;
		userId: string;
		message: string | null;
	}): Promise<CreateClaimRequestResult> {
		return withDbLogging('ClaimRequestService.create', async () => {
			const written = await db
				.insert(artistClaimRequests)
				.values({ artistId: input.artistId, userId: input.userId, message: input.message })
				.onConflictDoNothing({
					target: [artistClaimRequests.artistId, artistClaimRequests.userId]
				})
				.returning({ id: artistClaimRequests.id });
			return written.length > 0 ? { ok: true } : { ok: false, reason: 'already_requested' };
		});
	}
}
