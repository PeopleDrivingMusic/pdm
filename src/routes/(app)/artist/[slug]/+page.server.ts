import { AlbumService, ArtistService, TrackService } from "$lib/db/queries";
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
    const artist = await ArtistService.getArtistBySlug(params.slug);
    if (!artist) {
        throw error(404, 'Artist not found');
    }
    const [tracks, albums] = await Promise.all([
        TrackService.getTracksByArtist(artist.id, 1000),
        AlbumService.getAlbumsByArtist(artist.id)
        
    ]);
    return { artist, tracks, albums };
};