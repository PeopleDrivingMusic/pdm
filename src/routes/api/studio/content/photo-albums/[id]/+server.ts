import { json, type RequestHandler } from '@sveltejs/kit';
import type { ContentStatus, ContentVisibility } from '$lib/db/services/ContentService';
import { getArtistByCookie } from '$lib/server/artist-session';
import { ContentApplicationService } from '$lib/server/content';

const STATUS_VALUES = new Set(['draft', 'scheduled', 'published', 'archived']);
const VISIBILITY_VALUES = new Set(['public', 'followers', 'subscribers', 'investors']);

function normalizeStatus(value: unknown): ContentStatus {
	return typeof value === 'string' && STATUS_VALUES.has(value) ? (value as ContentStatus) : 'draft';
}

function normalizeVisibility(value: unknown): ContentVisibility {
	return typeof value === 'string' && VISIBILITY_VALUES.has(value)
		? (value as ContentVisibility)
		: 'public';
}

export const PATCH: RequestHandler = async (event) => {
	const artist = await getArtistByCookie(event);
	if (!artist) return json({ error: 'Unauthorized' }, { status: 401 });

	const albumId = event.params.id;
	if (!albumId) return json({ error: 'Gallery id is required' }, { status: 400 });

	const body = await event.request.json().catch(() => null);
	const title = typeof body?.title === 'string' ? body.title.trim() : '';
	const description = typeof body?.description === 'string' ? body.description.trim() : '';
	const visibility = normalizeVisibility(body?.visibility);
	const status = normalizeStatus(body?.status);

	if (!title) {
		return json({ error: 'Title is required' }, { status: 400 });
	}

	const album = await ContentApplicationService.updatePhotoAlbum({
		artistId: artist.id,
		collectionId: albumId,
		title,
		description,
		visibility,
		status
	});

	if (!album) return json({ error: 'Gallery not found' }, { status: 404 });

	return json({ album });
};

export const DELETE: RequestHandler = async (event) => {
	const artist = await getArtistByCookie(event);
	if (!artist) return json({ error: 'Unauthorized' }, { status: 401 });

	const albumId = event.params.id;
	if (!albumId) return json({ error: 'Gallery id is required' }, { status: 400 });

	const deleted = await ContentApplicationService.deletePhotoAlbum({
		artistId: artist.id,
		collectionId: albumId
	});

	if (!deleted) return json({ error: 'Gallery not found' }, { status: 404 });

	return json({ success: true });
};
