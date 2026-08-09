import { json } from '@sveltejs/kit';
import { CommentService } from '$lib/server/comments';
import type { CommentTargetType } from '$lib/db/services/CommentRepository';
import { requireSameOrigin, requireUser, isGuardResponse } from '$lib/server/security/guards';
import { createRateLimiter } from '$lib/server/security/rateLimiter';
import type { RequestHandler } from './$types';

const writeLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

const COMMENT_TARGET_TYPES: CommentTargetType[] = ['post', 'track'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate the target before it reaches the service: `target_id` maps to a uuid
 * column, so a malformed id would surface as a Postgres cast error (500) instead
 * of a clean 400.
 */
function parseTarget(
	targetType: unknown,
	targetId: unknown
): { targetType: CommentTargetType; targetId: string } | null {
	if (typeof targetType !== 'string' || typeof targetId !== 'string') return null;
	if (!COMMENT_TARGET_TYPES.includes(targetType as CommentTargetType)) return null;
	if (!UUID_PATTERN.test(targetId)) return null;
	return { targetType: targetType as CommentTargetType, targetId };
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const target = parseTarget(url.searchParams.get('targetType'), url.searchParams.get('targetId'));
	if (!target) return json({ error: 'Invalid target' }, { status: 400 });

	const comments = await CommentService.listForTarget({
		...target,
		viewerUserId: locals.user?.id ?? null
	});
	return json({ comments });
};

export const POST: RequestHandler = async (event) => {
	const origin = requireSameOrigin(event);
	if (origin) return origin;
	const auth = requireUser(event);
	if (isGuardResponse(auth)) return auth;

	if (!writeLimiter.check(auth.userId)) {
		return json({ error: 'Slow down a moment' }, { status: 429 });
	}

	const payload = await event.request.json().catch(() => null);
	const target = parseTarget(payload?.targetType, payload?.targetId);
	if (!target || typeof payload?.body !== 'string') {
		return json({ error: 'Invalid request' }, { status: 400 });
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

	if (!result.ok) return json({ error: result.reason }, { status: 422 });
	return json({ comment: result.comment }, { status: 201 });
};
