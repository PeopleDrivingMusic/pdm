import { fail, redirect, isRedirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ArtistAccountService } from '$lib/db/queries';
import {
	createArtistSession,
	deleteArtistSessionTokenCookie,
	generateArtistSessionToken,
	setArtistSessionTokenCookie,
	validateArtistSessionToken
} from '$lib/server/artist-session';
import { verifyPassword } from '$lib/utils/password';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const artistToken = event.cookies.get('artist_session') ?? null;
	if (artistToken) {
		const result = await validateArtistSessionToken(artistToken);
		if (result.artist) {
			throw redirect(302, '/studio/music');
		}
		deleteArtistSessionTokenCookie(event);
	}

	return {};
};

export const actions: Actions = {
	login: async (event) => {
		const formData = await event.request.formData();
		const login = formData.get('login')?.toString().trim();
		const password = formData.get('password')?.toString();

		if (!login || !password) {
			return fail(400, { error: 'Login and password are required.' });
		}

		try {
			const account = await ArtistAccountService.getByLogin(login);
			if (!account) {
				return fail(400, { error: 'Invalid login or password.' });
			}

			const validPassword = await verifyPassword(password, account.hashedPassword);
			if (!validPassword) {
				return fail(400, { error: 'Invalid login or password.' });
			}

			const sessionToken = generateArtistSessionToken();
			const session = await createArtistSession(sessionToken, account.id);
			setArtistSessionTokenCookie(event, sessionToken, session.expiresAt);

			logger.info('Artist logged in successfully', {
				component: 'auth',
				requestId: event.locals.requestId,
				metadata: { artistAccountId: account.id }
			});

			throw redirect(302, '/studio/music');
		} catch (error) {
			if (isRedirect(error)) {
				throw error;
			}

			logger.error('Artist login error', {
				component: 'auth',
				requestId: event.locals.requestId,
				metadata: { error, login }
			});

			return fail(500, { error: 'Internal server error.' });
		}
	}
};
