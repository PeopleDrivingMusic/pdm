import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { db } from "$lib/db";
import { artistSessions, artistAccounts, artists, type Artist, type ArtistSession, type ArtistAccount } from "$lib/db/schema";
import { eq } from "drizzle-orm";
import type { RequestEvent } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { logger } from "$lib/utils/logger";
import { ArtistAccountService, ArtistService } from "$lib/db/queries";

export function generateArtistSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	return encodeBase32LowerCaseNoPadding(bytes);
}

export async function createArtistSession(token: string, artistAccountId: string): Promise<ArtistSession> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const now = new Date();
	const session = {
		id: sessionId,
		artistAccountId,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
		createdAt: now
	};

	try {
		await db.insert(artistSessions).values(session);
		logger.info("Artist session created", {
			component: "auth",
			sessionId,
			metadata: { artistAccountId, expiresAt: session.expiresAt }
		});
		return session;
	} catch (error) {
		logger.error("Failed to create artist session", {
			component: "auth",
			metadata: { error, artistAccountId }
		});
		throw error;
	}
}

export async function validateArtistSessionToken(token: string): Promise<ArtistSessionValidationResult> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

	try {
		const result = await db
			.select({
				session: artistSessions,
				artistAccount: artistAccounts,
				artist: artists
			})
			.from(artistSessions)
			.innerJoin(artistAccounts, eq(artistSessions.artistAccountId, artistAccounts.id))
			.innerJoin(artists, eq(artistAccounts.artistId, artists.id))
			.where(eq(artistSessions.id, sessionId));

		if (result.length < 1) {
			logger.debug("Artist session not found", {
				component: "auth",
				metadata: { sessionId }
			});
			return { session: null, artistAccount: null, artist: null };
		}

		const { session, artistAccount, artist } = result[0];

		if (Date.now() >= session.expiresAt.getTime()) {
			await db.delete(artistSessions).where(eq(artistSessions.id, sessionId));
			logger.info("Expired artist session deleted", {
				component: "auth",
				sessionId,
				metadata: { expiredAt: session.expiresAt }
			});
			return { session: null, artistAccount: null, artist: null };
		}

		if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
			session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
			await db
				.update(artistSessions)
				.set({ expiresAt: session.expiresAt })
				.where(eq(artistSessions.id, sessionId));

			logger.debug("Artist session renewed", {
				component: "auth",
				sessionId,
				metadata: { newExpiresAt: session.expiresAt }
			});
		}

		logger.debug("Artist session validated", {
			component: "auth",
			sessionId,
			metadata: { artistId: artist.id, artistAccountId: artistAccount.id }
		});

		return { session, artistAccount, artist };
	} catch (error) {
		logger.error("Failed to validate artist session", {
			component: "auth",
			metadata: { error, sessionId }
		});
		return { session: null, artistAccount: null, artist: null };
	}
}

export async function invalidateArtistSession(sessionId: string): Promise<void> {
	try {
		await db.delete(artistSessions).where(eq(artistSessions.id, sessionId));
		logger.info("Artist session invalidated", {
			component: "auth",
			sessionId
		});
	} catch (error) {
		logger.error("Failed to invalidate artist session", {
			component: "auth",
			metadata: { error, sessionId }
		});
		throw error;
	}
}

export function setArtistSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date): void {
	event.cookies.set("artist_session", token, {
		httpOnly: true,
		sameSite: "lax",
		expires: expiresAt,
		path: "/",
		secure: !dev
	});

	logger.debug("Artist session cookie set", {
		component: "auth",
		requestId: event.locals.requestId,
		metadata: { expiresAt }
	});
}

export function deleteArtistSessionTokenCookie(event: RequestEvent): void {
	event.cookies.set("artist_session", "", {
		httpOnly: true,
		sameSite: "lax",
		maxAge: 0,
		path: "/",
		secure: !dev
	});

	logger.debug("Artist session cookie deleted", {
		component: "auth",
		requestId: event.locals.requestId
	});
}

export async function getArtistByCookie(event: RequestEvent): Promise<Artist | null> {
	const artistToken = event.cookies.get('artist_session') ?? null;
	let artist: Artist | null = null;

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
	return artist;
}

export type ArtistSessionValidationResult =
	| { session: ArtistSession; artistAccount: ArtistAccount; artist: Artist }
	| { session: null; artistAccount: null; artist: null };
