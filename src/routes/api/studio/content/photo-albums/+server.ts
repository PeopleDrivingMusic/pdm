import { json, type RequestHandler } from '@sveltejs/kit';
import type { ContentVisibility } from '$lib/db/services/ContentService';
import { getArtistByCookie } from '$lib/server/artist-session';
import { ContentApplicationService } from '$lib/server/content';

const VISIBILITY_VALUES = new Set(['public', 'subscribers']);

function normalizeVisibility(value: unknown): ContentVisibility {
	return typeof value === 'string' && VISIBILITY_VALUES.has(value)
		? (value as ContentVisibility)
		: 'subscribers'; // fail closed: unknown/legacy → restricted (matches sanitizeVisibility)
}

export const POST: RequestHandler = async (event) => {
	const artist = await getArtistByCookie(event);
	if (!artist) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await event.request.json().catch(() => null);
	const title = typeof body?.title === 'string' ? body.title.trim() : '';
	const description = typeof body?.description === 'string' ? body.description.trim() : '';
	const visibility = normalizeVisibility(body?.visibility);

	if (!title) {
		return json({ error: 'Title is required' }, { status: 400 });
	}

	const album = await ContentApplicationService.createPhotoAlbum({
		artistId: artist.id,
		title,
		description,
		visibility,
		status: 'draft'
	});

	return json({ album });
};
