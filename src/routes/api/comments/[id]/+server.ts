import { json } from '@sveltejs/kit';
import { CommentService } from '$lib/server/comments';
import { requireSameOrigin, requireUser, isGuardResponse } from '$lib/server/security/guards';
import type { RequestHandler } from './$types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DELETE: RequestHandler = async (event) => {
	const origin = requireSameOrigin(event);
	if (origin) return origin;
	const auth = requireUser(event);
	if (isGuardResponse(auth)) return auth;

	// The id maps to a uuid column — reject a malformed one here rather than letting
	// Postgres raise a cast error.
	const commentId = event.params.id;
	if (!UUID_PATTERN.test(commentId)) {
		return json({ error: 'Invalid comment id' }, { status: 400 });
	}

	const result = await CommentService.delete({ commentId, userId: auth.userId });
	if (result.ok) return json({ deleted: true });
	return json({ error: result.reason }, { status: result.reason === 'not_found' ? 404 : 403 });
};
