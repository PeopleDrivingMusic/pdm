import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { posts } from '$lib/db/schema';
import { ArtistService, TrackService } from '$lib/db/queries';
import { CommentRepository } from '$lib/db/services/CommentRepository';
import { EntitlementService } from '$lib/server/entitlement';

export type AccessTargetType = 'post' | 'track' | 'comment';

type AccessResult = { ok: true; ownerUserId: string } | { ok: false };

const DENIED: AccessResult = { ok: false };

/**
 * Can this viewer interact with the target at all?
 *
 * Writing to something (commenting, liking) must not be easier than reading it.
 * Without this, a caller could like or comment on an unpublished draft or a
 * subscribers-only post they can't see — and the returned like count would leak
 * engagement on gated content. Denial is always the same shape, so a caller can
 * answer 404 and never reveal whether the target exists.
 */
export async function resolveTargetAccess(
	targetType: AccessTargetType,
	targetId: string,
	viewerUserId: string | null
): Promise<AccessResult> {
	switch (targetType) {
		case 'post':
			return accessForContent(await loadPost(targetId), viewerUserId);
		case 'track':
			return accessForContent(await loadTrack(targetId), viewerUserId);
		case 'comment': {
			// A comment is exactly as reachable as the thing it hangs off.
			const comment = await CommentRepository.getById(targetId);
			if (!comment || comment.deletedAt) return DENIED;
			return resolveTargetAccess(
				comment.targetType as AccessTargetType,
				comment.targetId,
				viewerUserId
			);
		}
		default:
			return DENIED;
	}
}

interface ContentTarget {
	artistId: string;
	visibility: string;
	isPublished: boolean;
}

async function loadPost(id: string): Promise<ContentTarget | null> {
	const [row] = await db
		.select({ artistId: posts.artistId, visibility: posts.visibility, status: posts.status })
		.from(posts)
		.where(eq(posts.id, id))
		.limit(1);
	if (!row) return null;
	return {
		artistId: row.artistId,
		visibility: row.visibility,
		isPublished: row.status === 'published'
	};
}

async function loadTrack(id: string): Promise<ContentTarget | null> {
	const track = await TrackService.getTrackById(id);
	if (!track) return null;
	return {
		artistId: track.artistId,
		visibility: track.visibility,
		isPublished: Boolean(track.isPublished)
	};
}

async function accessForContent(
	target: ContentTarget | null,
	viewerUserId: string | null
): Promise<AccessResult> {
	if (!target) return DENIED;

	const artist = await ArtistService.getArtistById(target.artistId);
	const ownerUserId = artist?.userId;
	if (!ownerUserId) return DENIED;

	// The artist reaches their own content whatever its state.
	if (viewerUserId && viewerUserId === ownerUserId) return { ok: true, ownerUserId };

	if (!target.isPublished) return DENIED;
	if (target.visibility !== 'subscribers') return { ok: true, ownerUserId };

	// Gated: an anonymous viewer is never entitled, so don't ask the DB.
	if (!viewerUserId) return DENIED;
	const subscribed = await EntitlementService.isSubscriberOf(viewerUserId, target.artistId);
	return subscribed ? { ok: true, ownerUserId } : DENIED;
}
