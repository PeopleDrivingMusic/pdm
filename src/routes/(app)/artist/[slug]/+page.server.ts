import { AlbumService, ArtistService, TrackService } from '$lib/db/queries';
import { ArtistPublicContentService, PostPollService } from '$lib/db/services/ContentService';
import { EntitlementService } from '$lib/server/entitlement';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const artist = await ArtistService.getArtistBySlug(params.slug);
	if (!artist) {
		throw error(404, 'Artist not found');
	}

	const userId = locals.user?.id;
	const isOwner = userId === artist.userId;

	// Kick everything off WITHOUT awaiting (no waterfall). Owner is always entitled.
	const isSubscriberPromise = isOwner
		? Promise.resolve(true)
		: EntitlementService.isSubscriberOf(userId, artist.id);

	const albumsPromise = AlbumService.getAlbumsByArtist(artist.id);

	// tracks list query doesn't need entitlement, but the per-track `locked` flag does — chain it.
	const tracksPromise = Promise.all([
		TrackService.getTracksByArtist({ artistId: artist.id, userId, limit: 1000 }),
		isSubscriberPromise
	]).then(([tracks, isSubscriber]) =>
		tracks.map((entry) => ({
			...entry,
			locked: !isSubscriber && entry.track.visibility === 'subscribers_only'
		}))
	);

	// content aggregation needs the viewer's subscription — chain it too.
	const contentPromise = isSubscriberPromise.then((isSubscriber) =>
		ArtistPublicContentService.getArtistContent(artist.id, { userId, isOwner, isSubscriber })
	);

	// Await ONLY the essential, above-the-fold data (single-row lookup) — at the END,
	// so it doesn't block the streamed promises from starting.
	const isSubscriber = await isSubscriberPromise;

	return {
		artist,
		viewer: {
			isOwner,
			isSubscribed: !isOwner && isSubscriber,
			canSubscribe: Boolean(userId) && !isOwner && !isSubscriber,
			isLoggedIn: Boolean(userId)
		},
		// Streamed (un-awaited) — the template renders these with {#await} + skeletons.
		tracks: tracksPromise,
		albums: albumsPromise,
		content: contentPromise
	};
};

function getString(data: FormData, key: string) {
	const value = data.get(key);
	return typeof value === 'string' ? value.trim() : '';
}

export const actions: Actions = {
	votePoll: async ({ request, locals }) => {
		if (!locals.user?.id) {
			return fail(401, { error: 'Sign in to vote' });
		}

		const data = await request.formData();
		const pollId = getString(data, 'pollId');
		const optionId = getString(data, 'optionId');

		if (!pollId || !optionId) {
			return fail(400, { error: 'Invalid poll vote' });
		}

		const result = await PostPollService.vote({
			pollId,
			optionId,
			userId: locals.user.id
		});

		if (!result.ok) {
			return fail(400, { error: result.reason });
		}

		return { success: true };
	}
};
