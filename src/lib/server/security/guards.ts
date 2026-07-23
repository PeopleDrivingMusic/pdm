import { json, type RequestEvent } from '@sveltejs/kit';
import { isSameOrigin } from './origin';

/** 403 Response when the request is cross-origin, else null (proceed). */
export function requireSameOrigin(event: Pick<RequestEvent, 'request' | 'url'>): Response | null {
	return isSameOrigin(event) ? null : json({ error: 'Forbidden' }, { status: 403 });
}

/** Resolves the logged-in user's id, or a 401 Response to short-circuit. */
export function requireUser(event: Pick<RequestEvent, 'locals'>): { userId: string } | Response {
	const userId = event.locals.user?.id;
	if (!userId) return json({ error: 'Sign in required' }, { status: 401 });
	return { userId };
}

/** Narrow a guard's result to its short-circuit Response. */
export function isGuardResponse(value: unknown): value is Response {
	return value instanceof Response;
}
