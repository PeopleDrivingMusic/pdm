import { json, type RequestHandler } from '@sveltejs/kit';
import { getArtistByCookie } from '$lib/server/artist-session';
import { ContentApplicationService } from '$lib/server/content';
import { normalizeContentStatus, normalizeContentVisibility } from '$lib/db/content-visibility';

export const PATCH: RequestHandler = async (event) => {
	const artist = await getArtistByCookie(event);
	if (!artist) return json({ error: 'Unauthorized' }, { status: 401 });

	const collectionId = event.params.id;
	if (!collectionId) return json({ error: 'Playlist id is required' }, { status: 400 });

	const body = await event.request.json().catch(() => null);
	const title = typeof body?.title === 'string' ? body.title.trim() : '';
	const description = typeof body?.description === 'string' ? body.description.trim() : '';
	const visibility = normalizeContentVisibility(body?.visibility);
	const status = normalizeContentStatus(body?.status);

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
