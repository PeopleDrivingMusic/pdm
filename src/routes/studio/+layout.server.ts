import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { ArtistAccountService, ArtistService } from '$lib/db/queries';
import {
	createArtistSession,
	generateArtistSessionToken,
	setArtistSessionTokenCookie,
	validateArtistSessionToken
} from '$lib/server/artist-session';

export const load: LayoutServerLoad = async (event) => {
	const artistToken = event.cookies.get('artist_session') ?? null;
	let artist = null;

	if (artistToken) {
		const result = await validateArtistSessionToken(artistToken);
		artist = result.artist;
	}

	if (!artist && event.locals.user?.id) {
		const ownedArtist = await ArtistService.getArtistByUserId(event.locals.user.id);
		if (ownedArtist) {
			const artistAccount = await ArtistAccountService.getByArtistId(ownedArtist.id);
			if (artistAccount) {
				const sessionToken = generateArtistSessionToken();
				const session = await createArtistSession(sessionToken, artistAccount.id);
				setArtistSessionTokenCookie(event, sessionToken, session.expiresAt);
				artist = ownedArtist;
			}
		}
	}

	if (!artist) {
		throw redirect(302, '/artist/login');
	}

	return {
		user: event.locals.user,
		session: event.locals.session,
		artist
	};
};
