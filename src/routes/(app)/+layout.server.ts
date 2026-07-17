import { PlaylistService } from '$lib/db/services/PlaylistService';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const user = event.locals.user;

	return {
		user,
		session: event.locals.session,
		user_playlists: user ? PlaylistService.getUserPlaylists(user.id) : []
	};
};
