import { json, type RequestHandler } from '@sveltejs/kit';
import type { ContentStatus, ContentVisibility } from '$lib/db/services/ContentService';
import { getArtistByCookie } from '$lib/server/artist-session';
import { ContentApplicationService } from '$lib/server/content';

const STATUS_VALUES = new Set(['draft', 'scheduled', 'published', 'archived']);
const VISIBILITY_VALUES = new Set(['public', 'subscribers']);

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

	const collectionId = event.params.id;
	if (!collectionId) return json({ error: 'Playlist id is required' }, { status: 400 });

	const body = await event.request.json().catch(() => null);
	const title = typeof body?.title === 'string' ? body.title.trim() : '';
	const description = typeof body?.description === 'string' ? body.description.trim() : '';
	const visibility = normalizeVisibility(body?.visibility);
	const status = normalizeStatus(body?.status);

	if (!title) {
		return json({ error: 'Title is required' }, { status: 400 });
	}

	const collection = await ContentApplicationService.updateVideoCollection({
		artistId: artist.id,
		collectionId,
		title,
		description,
		visibility,
		status
	});

	if (!collection) return json({ error: 'Playlist not found' }, { status: 404 });

	return json({ collection });
};

export const DELETE: RequestHandler = async (event) => {
	const artist = await getArtistByCookie(event);
	if (!artist) return json({ error: 'Unauthorized' }, { status: 401 });

	const collectionId = event.params.id;
	if (!collectionId) return json({ error: 'Playlist id is required' }, { status: 400 });

	const deleted = await ContentApplicationService.deleteVideoCollection({
		artistId: artist.id,
		collectionId
	});

	if (!deleted) return json({ error: 'Playlist not found' }, { status: 404 });

	return json({ success: true });
};
