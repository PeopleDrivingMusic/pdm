import { json } from '@sveltejs/kit';
import { CommentService } from '$lib/server/comments';
import { commentReadLimiter, commentWriteLimiter } from '$lib/server/comments/rateLimits';
import type { CommentTargetType } from '$lib/messages/types';
import {
	requireSameOrigin,
	requireUser,
	isGuardResponse,
	tooManyRequests
} from '$lib/server/security/guards';
import { isUuid } from '$lib/server/security/uuid';
import { resolveTargetAccess } from '$lib/server/messages/access';
import type { RequestHandler } from './$types';

const COMMENT_TARGET_TYPES: CommentTargetType[] = ['post', 'track'];

/**
 * Validate the target before it reaches the service: `target_id` maps to a uuid
 * column, so a malformed id would surface as a Postgres cast error (500) instead
 * of a clean 400.
 */
function parseTarget(
	targetType: unknown,
	targetId: unknown
): { targetType: CommentTargetType; targetId: string } | null {
	if (typeof targetType !== 'string' || !isUuid(targetId)) return null;
	if (!COMMENT_TARGET_TYPES.includes(targetType as CommentTargetType)) return null;
	return { targetType: targetType as CommentTargetType, targetId };
}

export const GET: RequestHandler = async (event) => {
	// Reads are public and unauthenticated, so meter them per client address —
	// otherwise an anonymous loop can monopolise the DB pool.
	if (!commentReadLimiter.check(event.getClientAddress())) return tooManyRequests();

	const target = parseTarget(
		event.url.searchParams.get('targetType'),
		event.url.searchParams.get('targetId')
	);
	if (!target) return json({ error: 'invalid_target' }, { status: 400 });

	// The conversation is as gated as the thing it hangs off: a subscribers-only
	// post's comments are part of what the subscription unlocks, and a draft's
	// shouldn't be readable at all. 404 rather than 403 so the id isn't confirmed.
	const access = await resolveTargetAccess(
		target.targetType,
		target.targetId,
		event.locals.user?.id ?? null
	);
	if (!access.ok) return json({ error: 'invalid_target' }, { status: 404 });

	const comments = await CommentService.listForTarget({
		...target,
		viewerUserId: event.locals.user?.id ?? null
	});
	return json({ comments });
};

export const POST: RequestHandler = async (event) => {
	const origin = requireSameOrigin(event);
	if (origin) return origin;
	const auth = requireUser(event);
	if (isGuardResponse(auth)) return auth;

	if (!commentWriteLimiter.check(auth.userId)) return tooManyRequests();

	const payload = await event.request.json().catch(() => null);
	const target = parseTarget(payload?.targetType, payload?.targetId);
	if (!target || typeof payload?.body !== 'string') {
		return json({ error: 'invalid_request' }, { status: 400 });
	}

	// The author is the logged-in user — pass their session identity straight through
	// so the returned DTO renders correctly without a second lookup.
	const user = event.locals.user;
	const result = await CommentService.create({
		...target,
		authorId: auth.userId,
		authorName: user?.displayName ?? null,
		authorUsername: user?.username ?? null,
		authorAvatar: user?.avatarUrl ?? null,
		body: payload.body
	});

	if (result.ok) return json({ comment: result.comment }, { status: 201 });

	// invalid_target = the post/track does not exist (or is gone) → 404;
	// a policy refusal stays 422; empty/too_long are malformed input → 400.
	const status =
		result.reason === 'invalid_target' ? 404 : result.reason === 'links_not_allowed' ? 422 : 400;
	return json({ error: result.reason }, { status });
};
