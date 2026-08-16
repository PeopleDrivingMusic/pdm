import { LikeRepository } from '$lib/db/services/LikeRepository';
import { resolveTargetAccess } from '$lib/server/messages/access';
import type { LikeSummary, LikeTargetType } from '$lib/messages/types';

const LIKE_TARGET_TYPES: LikeTargetType[] = ['comment', 'post'];

type ToggleResult =
	| { ok: true; liked: boolean; likeCount: number }
	| { ok: false; reason: 'invalid_target' };

/**
 * Application boundary for likes. One service covers every likeable entity even
 * though each has its own table — callers name a target type and never learn
 * which table backs it. Returns primitives only.
 */
export class LikeService {
	/** Flip the viewer's like and report the resulting state plus the fresh count. */
	static async toggle(
		targetType: LikeTargetType,
		targetId: string,
		userId: string
	): Promise<ToggleResult> {
		if (!LIKE_TARGET_TYPES.includes(targetType)) {
			return { ok: false, reason: 'invalid_target' };
		}

		// Writing must not be easier than reading. Without this, a caller could like
		// an unpublished draft or a subscribers-only post they can't see, and the
		// returned count would leak engagement on gated content. It also keeps a
		// nonexistent id from reaching the FK and surfacing as a 500.
		const access = await resolveTargetAccess(targetType, targetId, userId);
		if (!access.ok) return { ok: false, reason: 'invalid_target' };

		const liked = await LikeRepository.toggle(targetType, targetId, userId);
		// Re-read rather than trusting an increment: two tabs can race the same row.
		const counts = await LikeRepository.countForTargets(targetType, [targetId]);
		return { ok: true, liked, likeCount: counts.get(targetId) ?? 0 };
	}

	/**
	 * Counts plus "did this viewer like it" for a batch of targets — one grouped
	 * count and one narrow membership query, never per-row lookups.
	 */
	static async summaryFor(
		targetType: LikeTargetType,
		targetIds: string[],
		viewerUserId: string | null
	): Promise<Map<string, LikeSummary>> {
		if (targetIds.length === 0) return new Map();

		const [counts, liked] = await Promise.all([
			LikeRepository.countForTargets(targetType, targetIds),
			// An anonymous viewer has liked nothing — don't ask the DB.
			viewerUserId
				? LikeRepository.likedByUser(viewerUserId, targetType, targetIds)
				: Promise.resolve(new Set<string>())
		]);

		return new Map(
			targetIds.map((id) => [id, { likeCount: counts.get(id) ?? 0, likedByViewer: liked.has(id) }])
		);
	}
}
