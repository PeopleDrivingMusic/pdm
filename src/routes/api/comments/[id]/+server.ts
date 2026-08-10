import { json } from '@sveltejs/kit';
import { CommentService } from '$lib/server/comments';
import { commentWriteLimiter } from '$lib/server/comments/rateLimits';
import {
	requireSameOrigin,
	requireUser,
	isGuardResponse,
	tooManyRequests
} from '$lib/server/security/guards';
import { isUuid } from '$lib/server/security/uuid';
import type { RequestHandler } from './$types';

/**
 * Shared prelude for the mutating handlers: same-origin, authenticated, within the
 * per-user write budget, and pointed at a well-formed uuid (the column is a uuid,
 * so a malformed id would otherwise raise a Postgres cast error).
 */
function authorizeWrite(event: Parameters<RequestHandler>[0]) {
	const origin = requireSameOrigin(event);
	if (origin) return { response: origin };

	const auth = requireUser(event);
	if (isGuardResponse(auth)) return { response: auth };

	if (!commentWriteLimiter.check(auth.userId)) return { response: tooManyRequests() };

	const commentId = event.params.id;
	if (!isUuid(commentId)) {
		return { response: json({ error: 'invalid_comment_id' }, { status: 400 }) };
	}

	return { userId: auth.userId, commentId };
}

export const PUT: RequestHandler = async (event) => {
	const gate = authorizeWrite(event);
	if (gate.response) return gate.response;

	const payload = await event.request.json().catch(() => null);
	if (typeof payload?.body !== 'string') {
		return json({ error: 'invalid_request' }, { status: 400 });
	}

	// Identity comes from the session so the returned DTO renders without a re-fetch.
	const user = event.locals.user;
	const result = await CommentService.edit({
		commentId: gate.commentId,
		userId: gate.userId,
		authorName: user?.displayName ?? null,
		authorUsername: user?.username ?? null,
		authorAvatar: user?.avatarUrl ?? null,
		body: payload.body
	});

	if (result.ok) return json({ comment: result.comment });

	// not_found -> 404, forbidden (not the author) -> 403, a policy refusal -> 422,
	// empty/too_long are malformed input -> 400.
	const status =
		result.reason === 'not_found'
			? 404
			: result.reason === 'forbidden'
				? 403
				: result.reason === 'links_not_allowed'
					? 422
					: 400;
	return json({ error: result.reason }, { status });
};

export const DELETE: RequestHandler = async (event) => {
	const gate = authorizeWrite(event);
	if (gate.response) return gate.response;

	const result = await CommentService.delete({
		commentId: gate.commentId,
		userId: gate.userId
	});
	if (result.ok) return json({ deleted: true });
	return json({ error: result.reason }, { status: result.reason === 'not_found' ? 404 : 403 });
};
