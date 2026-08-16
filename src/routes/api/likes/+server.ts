import { json } from '@sveltejs/kit';
import { LikeService } from '$lib/server/likes';
import { likeWriteLimiter } from '$lib/server/likes/rateLimits';
import type { LikeTargetType } from '$lib/messages/types';
import {
	requireSameOrigin,
	requireUser,
	isGuardResponse,
	tooManyRequests
} from '$lib/server/security/guards';
import { isUuid } from '$lib/server/security/uuid';
import type { RequestHandler } from './$types';

const LIKE_TARGET_TYPES: LikeTargetType[] = ['comment', 'post'];

/** Toggle the caller's like on a comment or a post. */
export const POST: RequestHandler = async (event) => {
	const origin = requireSameOrigin(event);
	if (origin) return origin;
	const auth = requireUser(event);
	if (isGuardResponse(auth)) return auth;

	if (!likeWriteLimiter.check(auth.userId)) return tooManyRequests();

	const payload = await event.request.json().catch(() => null);
	const targetType = payload?.targetType as LikeTargetType;
	// Validate before the service: the id lands in a uuid column, so a malformed
	// one would surface as a Postgres cast error rather than a clean 400.
	if (!LIKE_TARGET_TYPES.includes(targetType) || !isUuid(payload?.targetId)) {
		return json({ error: 'invalid_request' }, { status: 400 });
	}

	const result = await LikeService.toggle(targetType, payload.targetId, auth.userId);
	if (!result.ok) return json({ error: result.reason }, { status: 404 });

	return json({ liked: result.liked, likeCount: result.likeCount });
};
