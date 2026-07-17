import { PlaylistService } from "$lib/db/services/PlaylistService";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
	if (!event.locals.user) {
		throw redirect(302, '/login');
	}
	return {
		user: event.locals.user,
		session: event.locals.session,
		user_playlists: PlaylistService.getUserPlaylists(event.locals.user?.id || "")
	};
};
