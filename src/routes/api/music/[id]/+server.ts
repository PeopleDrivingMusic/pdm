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

		const signedUrl = await getFileUrlFromR2({ uniqueKey: track.audioUrl, bucket: 'music' });
		return json({ src: signedUrl.streamUrl });
	} catch (error) {
		console.error('Error fetching track:', error);
		throw error;
	}
};
