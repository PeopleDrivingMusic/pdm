import { json } from '@sveltejs/kit';
import { CommentService } from '$lib/server/comments';
import { commentWriteLimiter } from '$lib/server/comments/rateLimits';
import { requireSameOrigin, requireUser, isGuardResponse } from '$lib/server/security/guards';
import { isUuid } from '$lib/server/security/uuid';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async (event) => {
	const origin = requireSameOrigin(event);
	if (origin) return origin;
	const auth = requireUser(event);
	if (isGuardResponse(auth)) return auth;

	// Deletes are a mutation and cost a lookup plus a write — meter them with the
	// same per-user budget as creates.
	if (!commentWriteLimiter.check(auth.userId)) {
		return json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '60' } });
	}

	// The id maps to a uuid column — reject a malformed one here rather than letting
	// Postgres raise a cast error.
	const commentId = event.params.id;
	if (!isUuid(commentId)) return json({ error: 'invalid_comment_id' }, { status: 400 });

	const result = await CommentService.delete({ commentId, userId: auth.userId });
	if (result.ok) return json({ deleted: true });
	return json({ error: result.reason }, { status: result.reason === 'not_found' ? 404 : 403 });
};
