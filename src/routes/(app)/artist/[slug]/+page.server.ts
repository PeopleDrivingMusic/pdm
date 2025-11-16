import { AlbumService, ArtistService, TrackService } from "$lib/db/queries";
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
    const artist = await ArtistService.getArtistBySlug(params.slug);
    if (!artist) {
        throw error(404, 'Artist not found');
    }
    const [tracks, albums] = await Promise.all([
        TrackService.getTracksByArtist({ artistId: artist.id, userId: locals.user?.id, limit: 1000 }),
        AlbumService.getAlbumsByArtist(artist.id)
        
    ]);
    return { artist, tracks, albums };
};