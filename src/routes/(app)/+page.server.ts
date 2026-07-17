import { TrackService } from '$lib/db/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const tracks = await TrackService.getPopularTracks({ limit: 12, userId: event.locals.user?.id });
	return { tracks };
};
