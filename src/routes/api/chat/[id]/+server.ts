import { json } from '@sveltejs/kit';
import { ChatService } from '$lib/server/chat';
import { requireSameOrigin, requireUser, isGuardResponse } from '$lib/server/security/guards';
import { isUuid } from '$lib/server/security/uuid';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async (event) => {
	const origin = requireSameOrigin(event);
	if (origin) return origin;
	const auth = requireUser(event);
	if (isGuardResponse(auth)) return auth;

	const artistId = event.url.searchParams.get('artistId');
	if (!isUuid(event.params.id) || !isUuid(artistId)) {
		return json({ error: 'invalid_request' }, { status: 400 });
	}

	const result = await ChatService.delete({
		messageId: event.params.id,
		userId: auth.userId,
		artistId
	});
	if (result.ok) return json({ ok: true });
	return json({ error: result.reason }, { status: result.reason === 'not_found' ? 404 : 403 });
};
