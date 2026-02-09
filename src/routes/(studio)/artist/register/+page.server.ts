import { fail, redirect, isRedirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ArtistAccountService, ArtistOnboardingService, ArtistService } from '$lib/db/queries';
import { generateArtistSessionToken, createArtistSession, setArtistSessionTokenCookie } from '$lib/server/artist-session';
import { hashPassword } from '$lib/utils/password';
import { logger } from '$lib/utils/logger';

const listenersCountMap: Record<string, number> = {
    '0-1k': 1000,
    '1k-10k': 10000,
    '10k-100k': 100000,
    '100k-1m': 1000000,
    '1m-plus': 1000000
};

const slugify = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

const getUniqueSlug = async (base: string) => {
    let slug = base || 'artist';
    let suffix = 1;

    while (await ArtistService.getArtistBySlug(slug)) {
        slug = `${base}-${suffix}`;
        suffix += 1;
    }

    return slug;
};

export const load = (async (event) => {
    if (!event.locals.user) {
        throw redirect(302, '/login');
    }

    return {};
}) satisfies PageServerLoad;

export const actions: Actions = {
    register: async (event) => {
        if (!event.locals.user) {
            return fail(401, { error: 'Please sign in to continue.' });
        }

        const formData = await event.request.formData();
        const name = formData.get('name')?.toString().trim();
        const listenersCount = formData.get('listenersCount')?.toString().trim();
        const instagram = formData.get('instagram')?.toString().trim();
        const spotify = formData.get('spotify')?.toString().trim();
        const youtube = formData.get('youtube')?.toString().trim();
        const login = formData.get('login')?.toString().trim();
        const password = formData.get('password')?.toString();
        const confirmPassword = formData.get('confirmPassword')?.toString();

        if (!name || !listenersCount || !login || !password || !confirmPassword) {
            return fail(400, { error: 'Please fill in all required fields.' });
        }

        if (password.length < 8) {
            return fail(400, { error: 'Password must be at least 8 characters long.' });
        }

        if (password !== confirmPassword) {
            return fail(400, { error: 'Passwords do not match.' });
        }

        if (!instagram && !spotify && !youtube) {
            return fail(400, { error: 'Please provide at least one social link.' });
        }

        const mappedListenersCount = listenersCountMap[listenersCount];
        if (!mappedListenersCount) {
            return fail(400, { error: 'Invalid listeners range selected.' });
        }

        try {
            const existingArtist = await ArtistService.getArtistByUserId(event.locals.user.id);
            if (existingArtist) {
                return fail(400, { error: 'You already have an artist profile.' });
            }

            const existingLogin = await ArtistAccountService.getByLogin(login);
            if (existingLogin) {
                return fail(400, { error: 'This login is already taken.' });
            }

            const socialLinksEntries = Object.entries({ instagram, spotify, youtube }).filter(([, value]) => value);
            const socialLinks = socialLinksEntries.length > 0 ? Object.fromEntries(socialLinksEntries) : undefined;

            const slugBase = slugify(name);
            const slug = await getUniqueSlug(slugBase);

            const artist = await ArtistService.createArtist({
                userId: event.locals.user.id,
                name,
                slug,
                socialLinks,
                isActive: false
            });

            await ArtistOnboardingService.createRequest({
                userId: event.locals.user.id,
                name,
                listenersCount: mappedListenersCount,
                socialLinks,
                status: 'pending'
            });

            const hashedPassword = await hashPassword(password);
            const artistAccount = await ArtistAccountService.createAccount({
                artistId: artist.id,
                login,
                hashedPassword,
                isActive: true
            });

            const sessionToken = generateArtistSessionToken();
            const session = await createArtistSession(sessionToken, artistAccount.id);
            setArtistSessionTokenCookie(event, sessionToken, session.expiresAt);

            logger.info('Artist onboarding request created', {
                component: 'artist-onboarding',
                userId: event.locals.user.id,
                requestId: event.locals.requestId,
                metadata: { artistId: artist.id }
            });

            throw redirect(302, '/artist/register/success');
        } catch (error) {
            if (isRedirect(error)) {
                throw error;
            }

            logger.error('Artist registration failed', {
                component: 'artist-onboarding',
                userId: event.locals.user.id,
                requestId: event.locals.requestId,
                metadata: { error }
            });

            return fail(500, { error: 'Something went wrong. Please try again.' });
        }
    }
};