import { AlbumService, ArtistService, TrackService } from "$lib/db/queries";
import { ArtistPublicContentService, PostPollService } from "$lib/db/services/ContentService";
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
    const artist = await ArtistService.getArtistBySlug(params.slug);
    if (!artist) {
        throw error(404, 'Artist not found');
    }
    const viewer = {
        userId: locals.user?.id,
        isOwner: locals.user?.id === artist.userId,
        isFollower: false,
        isSubscriber: false,
        isInvestor: false
    };

    const [tracks, albums, content] = await Promise.all([
        TrackService.getTracksByArtist({ artistId: artist.id, userId: locals.user?.id, limit: 1000 }),
        AlbumService.getAlbumsByArtist(artist.id),
        ArtistPublicContentService.getArtistContent(artist.id, viewer)
        
    ]);
    return { artist, tracks, albums, content };
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
