import { json, type RequestEvent } from '@sveltejs/kit';
import { isSameOrigin } from './origin';

/** 403 Response when the request is cross-origin, else null (proceed). */
export function requireSameOrigin(event: Pick<RequestEvent, 'request' | 'url'>): Response | null {
	return isSameOrigin(event) ? null : json({ error: 'forbidden' }, { status: 403 });
}

/** Resolves the logged-in user's id, or a 401 Response to short-circuit. */
export function requireUser(event: Pick<RequestEvent, 'locals'>): { userId: string } | Response {
	const userId = event.locals.user?.id;
	if (!userId) return json({ error: 'unauthorized' }, { status: 401 });
	return { userId };
}

/** 429 Response for a caller that exceeded a rate limit, with a Retry-After hint. */
export function tooManyRequests(retryAfterSeconds = 60): Response {
	return json(
		{ error: 'rate_limited' },
		{ status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
	);
}

/** Narrow a guard's result to its short-circuit Response. */
export function isGuardResponse(value: unknown): value is Response {
	return value instanceof Response;
}
