import { json, type RequestHandler } from '@sveltejs/kit';
import { getArtistByCookie } from '$lib/server/artist-session';
import { isSameOrigin } from '$lib/server/security/origin';
import { createRateLimiter } from '$lib/server/security/rateLimiter';
import { resolveUploadTarget } from '$lib/server/media/uploadTargetHandler';

const uploadTargetLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

export const POST: RequestHandler = async (event) => {
	const artist = await getArtistByCookie(event);
	if (!artist) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!isSameOrigin(event)) return json({ error: 'Forbidden' }, { status: 403 });
	if (!uploadTargetLimiter.check(artist.id)) {
		return json({ error: 'Too many requests' }, { status: 429 });
	}

	const body = await event.request.json().catch(() => null);
	if (!body || typeof body !== 'object') return json({ error: 'Invalid body' }, { status: 400 });

	const result = await resolveUploadTarget(artist.id, body as Record<string, unknown>);
	if ('error' in result) return json({ error: result.error }, { status: result.status });
	return json(result);
};
