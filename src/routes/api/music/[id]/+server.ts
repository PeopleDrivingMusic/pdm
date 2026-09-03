import { TrackService } from '$lib/db/queries';
import { getFileUrlFromR2 } from '$lib/db/services/R2Service';
import { httpsUrl } from '$lib/server/catalog-source/sanitize';
import { resolveTargetAccess } from '$lib/server/messages/access';
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

		// The same status/is_published/visibility/owner/subscriber policy every other
		// content endpoint uses — previously hand-rolled here, which is how a missing
		// `is_published` check went unnoticed (see git history). `resolveTargetAccess`
		// also covers the seeded/null-owner case for free.
		const access = await resolveTargetAccess('track', id, locals.user?.id ?? null);
		if (!access.ok) {
			return track.isPublished
				? new Response('Subscribe to listen', { status: 403 })
				: new Response('Track not found', { status: 404 });
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

		// Validated again at the read boundary, not only at ingest: this string is handed
		// to a browser as an audio source, and `sanitize.ts` only guards the one writer
		// that exists today. A second source, or any writer that skips it, would
		// otherwise turn a stored value into whatever the browser fetches.
		const sourceUrl = httpsUrl(track.audioUrl);
		if (!sourceUrl) {
			return new Response('Track not found', { status: 404 });
		}
		return json({ src: sourceUrl });
	} catch (error) {
		console.error('Error fetching track:', error);
		throw error;
	}
};
