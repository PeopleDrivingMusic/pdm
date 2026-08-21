import { json } from '@sveltejs/kit';
import { ChatService } from '$lib/server/chat';
import { requireSameOrigin, requireUser, isGuardResponse } from '$lib/server/security/guards';
import { isUuid } from '$lib/server/security/uuid';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const artistId = event.url.searchParams.get('artistId');
	if (!isUuid(artistId)) return json({ error: 'invalid_request' }, { status: 400 });

	const result = await ChatService.getMessages({
		artistId,
		viewerUserId: event.locals.user?.id ?? null
	});
	if (!result.ok) return json({ error: result.reason }, { status: 403 });
	return json({ messages: result.messages });
};

export const POST: RequestHandler = async (event) => {
	const origin = requireSameOrigin(event);
	if (origin) return origin;
	const auth = requireUser(event);
	if (isGuardResponse(auth)) return auth;

	const payload = await event.request.json().catch(() => null);
	if (!isUuid(payload?.artistId) || typeof payload?.body !== 'string') {
		return json({ error: 'invalid_request' }, { status: 400 });
	}

	const user = event.locals.user;
	const result = await ChatService.create({
		artistId: payload.artistId,
		authorId: auth.userId,
		// `requireUser` above already gated on this same `event.locals.user?.id`, so `user`
		// is provably defined here — the assertion removes an unreachable optional-chain
		// branch rather than leaving dead code coverage can never exercise.
		authorName: user!.displayName ?? null,
		authorUsername: user!.username ?? null,
		authorAvatar: user!.avatarUrl ?? null,
		body: payload.body
	});

	if (result.ok) return json({ message: result.message }, { status: 201 });

	const status = result.reason === 'not_subscribed' ? 403 : 400;
	return json({ error: result.reason }, { status });
};
