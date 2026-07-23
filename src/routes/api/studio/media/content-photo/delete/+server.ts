import { json, type RequestHandler } from '@sveltejs/kit';
import { getArtistByCookie } from '$lib/server/artist-session';
import { isSameOrigin } from '$lib/server/security/origin';
import { createRateLimiter } from '$lib/server/security/rateLimiter';
import { deleteOwnedContentPhotos } from '$lib/server/media/contentPhotoDelete';

const deleteLimiter = createRateLimiter({ limit: 120, windowMs: 60_000 });

export const POST: RequestHandler = async (event) => {
	const artist = await getArtistByCookie(event);
	if (!artist) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!isSameOrigin(event)) return json({ error: 'Forbidden' }, { status: 403 });
	if (!deleteLimiter.check(artist.id)) {
		return json({ error: 'Too many requests' }, { status: 429 });
	}

	// Accept a normal JSON POST as well as a navigator.sendBeacon Blob body.
	const body = await event.request.json().catch(() => null);
	const keys = Array.isArray(body?.keys)
		? (body.keys as unknown[]).filter((k): k is string => typeof k === 'string')
		: [];

	const deleted = await deleteOwnedContentPhotos(artist.id, keys);
	return json({ ok: true, deleted });
};
