import { PlaylistService } from "$lib/db/services/PlaylistService";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
	return {
		user: event.locals.user,
		session: event.locals.session,
		user_playlists: PlaylistService.getUserPlaylists(event.locals.user?.id || "")
	};
};
