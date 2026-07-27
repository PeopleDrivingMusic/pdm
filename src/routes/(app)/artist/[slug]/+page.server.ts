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

	// Fire the entitlement lookup + the independent list queries immediately (no waterfall).
	// The list queries don't need entitlement, so they run in parallel with it. Owner is
	// always entitled.
	const isSubscriberPromise = isOwner
		? Promise.resolve(true)
		: EntitlementService.isSubscriberOf(userId, artist.id);
	const albumsPromise = AlbumService.getAlbumsByArtist(artist.id);
	const tracksQueryPromise = TrackService.getTracksByArtist({
		artistId: artist.id,
		userId,
		limit: 1000
	});

	// Await the essential above-the-fold flag (a single-row lookup). Resolving it here — rather
	// than chaining the streamed promises off the still-pending promise — means a failed
	// entitlement lookup rejects the load cleanly, with no dangling rejected promises.
	const isSubscriber = await isSubscriberPromise;

	// Streamed: derive the per-track `locked` flag from the already-firing query + resolved flag.
	const tracksPromise = tracksQueryPromise.then((tracks) =>
		tracks.map((entry) => ({
			...entry,
			locked: !isSubscriber && entry.track.visibility === 'subscribers_only'
		}))
	);

	// Streamed: content aggregation (the heavy query) starts right after the flag resolves.
	const contentPromise = ArtistPublicContentService.getArtistContent(artist.id, {
		userId,
		isOwner,
		isSubscriber
	});

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
