import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { ArtistAccountService, ArtistService } from '$lib/db/queries';
import {
	createArtistSession,
	generateArtistSessionToken,
	getArtistByCookie,
	setArtistSessionTokenCookie,
	validateArtistSessionToken
} from '$lib/server/artist-session';

export const load: LayoutServerLoad = async (event) => {
	const artist = await getArtistByCookie(event);

	if (!artist) {
		throw redirect(302, '/artist/login');
	}

	return {
		user: event.locals.user,
		session: event.locals.session,
		artist
	};
};
