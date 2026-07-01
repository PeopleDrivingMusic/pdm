import { json, type RequestHandler } from '@sveltejs/kit';
import { getArtistByCookie } from '$lib/server/artist-session';
import { MediaUploadService } from '$lib/server/media';
import { isSameOrigin } from '$lib/server/security/origin';
import { createRateLimiter } from '$lib/server/security/rateLimiter';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const uploadTargetLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

export const POST: RequestHandler = async (event) => {
	const artist = await getArtistByCookie(event);
	if (!artist) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!isSameOrigin(event)) return json({ error: 'Forbidden' }, { status: 403 });
	if (!uploadTargetLimiter.check(artist.id)) {
		return json({ error: 'Too many requests' }, { status: 429 });
	}

	const body = await event.request.json().catch(() => null);
	const kind = typeof body?.kind === 'string' ? body.kind : '';
	const fileName = typeof body?.fileName === 'string' ? body.fileName : '';
	const contentType = typeof body?.contentType === 'string' ? body.contentType : '';
	const size = typeof body?.size === 'number' ? body.size : Number(body?.size ?? 0);

	if (kind !== 'content-photo') {
		return json({ error: 'Unsupported upload kind' }, { status: 400 });
	}
	if (!fileName || !contentType || !Number.isFinite(size) || size <= 0) {
		return json({ error: 'File metadata is required' }, { status: 400 });
	}
	if (!IMAGE_TYPES.has(contentType)) {
		return json({ error: 'Unsupported image format' }, { status: 400 });
	}
	if (size > MAX_IMAGE_SIZE) {
		return json({ error: 'Image is too large' }, { status: 400 });
	}

	const upload = await MediaUploadService.createContentPhotoUpload({
		artistId: artist.id,
		fileName,
		contentType,
		size
	});

	return json({ upload });
};
