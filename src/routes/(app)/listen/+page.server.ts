import { TrackService } from "$lib/db/queries";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {

    const tracks = await TrackService.getPopularTracks({limit: 10});
    return { tracks };
};