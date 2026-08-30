import { AlbumService, ArtistService, TrackService } from '$lib/db/queries';
import { ArtistPublicContentService, PostPollService } from '$lib/db/services/ContentService';
import { EntitlementService } from '$lib/server/entitlement';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const artist = await ArtistService.getArtistBySlug(params.slug);
	// Imported artists are seeded data, not pages. This route renders a name, avatar,
	// banner and bio under a Subscribe CTA with no "unofficial account" notice and no
	// attribution — passing off a real person until slice S2b builds the page that may
	// legitimately show them. Gate on `origin`, not `isActive`: native artists awaiting
	// onboarding approval are created inactive too (artist/register) and must stay
	// reachable, and `isActive` is nullable so its falsiness is ambiguous.
	if (!artist || artist.origin !== 'native') {
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

	// Await the essential above-the-fold flag (a single-row lookup). Fail closed if the lookup
	// errors: treat the viewer as a non-subscriber (content stays locked) rather than throwing —
	// which also prevents the already-firing list queries from dangling as unhandled rejections.
	let isSubscriber: boolean;
	try {
		isSubscriber = await isSubscriberPromise;
	} catch {
		isSubscriber = false;
	}

	// Streamed: derive the per-track `locked` flag from the already-firing query + resolved flag.
	const tracksPromise = tracksQueryPromise.then((tracks) =>
		tracks.map((entry) => ({
			...entry,
			locked: !isSubscriber && entry.track.visibility === 'subscribers'
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
