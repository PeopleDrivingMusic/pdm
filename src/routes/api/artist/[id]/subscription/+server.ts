import { json } from '@sveltejs/kit';
import { EntitlementService } from '$lib/server/entitlement';
import { requireSameOrigin, requireUser, isGuardResponse } from '$lib/server/security/guards';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const origin = requireSameOrigin(event);
	if (origin) return origin;
	const auth = requireUser(event);
	if (isGuardResponse(auth)) return auth;

	await EntitlementService.subscribe(auth.userId, event.params.id);
	return json({ subscribed: true });
};

export const DELETE: RequestHandler = async (event) => {
	const origin = requireSameOrigin(event);
	if (origin) return origin;
	const auth = requireUser(event);
	if (isGuardResponse(auth)) return auth;

	await EntitlementService.unsubscribe(auth.userId, event.params.id);
	return json({ subscribed: false });
};
