import { TrackService, ArtistService } from '$lib/db/queries';
import { getFileUrlFromR2 } from '$lib/db/services/R2Service';
import { EntitlementService } from '$lib/server/entitlement';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params: { id }, locals }) => {
	try {
		const track = await TrackService.getTrackById(id);
		if (!track || !track.audioUrl) {
			return new Response('Track not found', { status: 404 });
		}
		if (track.status !== 'uploaded' && track.status !== 'ready') {
			return new Response('Track is not ready', { status: 409 });
		}

		if (track.visibility === 'subscribers') {
			const userId = locals.user?.id;
			if (!userId) {
				return new Response('Subscribe to listen', { status: 403 });
			}

			const artist = await ArtistService.getArtistById(track.artistId);
			const isOwner = userId === artist?.userId;
			if (!isOwner) {
				const allowed = await EntitlementService.isSubscriberOf(userId, track.artistId);
				if (!allowed) {
					return new Response('Subscribe to listen', { status: 403 });
				}
			}
		}

		// A source-hosted track's `audio_url` is the source's own stable stream endpoint,
		// not an object key in our bucket — presigning it would sign an object that does
		// not exist. The endpoint itself redirects to a short-lived signed URL at request
		// time, which is why it is safe to store and hand out verbatim.
		//
		// This sits below the entitlement gate on purpose: the branch must never become a
		// way to reach a subscriber-only track without subscribing.
		if (track.audioSource === 'r2' || !track.audioSource) {
			const signedUrl = await getFileUrlFromR2({ uniqueKey: track.audioUrl, bucket: 'music' });
			return json({ src: signedUrl.streamUrl });
		}

		return json({ src: track.audioUrl });
	} catch (error) {
		console.error('Error fetching track:', error);
		throw error;
	}
};
