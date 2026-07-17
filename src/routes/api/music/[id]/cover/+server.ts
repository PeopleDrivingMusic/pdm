import { TrackService } from '$lib/db/queries';
import { getFileUrlFromR2 } from '$lib/db/services/R2Service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({params: {id}}) => {
    try {
        const track = await TrackService.getTrackById(id);
        if (!track || !track.imageUrl) {
            return new Response('Track not found', { status: 404 });
        }
        const signedUrl = await getFileUrlFromR2({ uniqueKey: track.imageUrl, bucket: "images" });
        return json({ src: signedUrl.streamUrl });
    } catch (error) {
        console.error('Error fetching track:', error);
        throw error;
    }
};
