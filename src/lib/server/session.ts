import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { db } from "$lib/db";
import { sessions, users, type User, type Session } from "$lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { RequestEvent } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { logger } from "$lib/utils/logger";

export function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	const token = encodeBase32LowerCaseNoPadding(bytes);
	return token;
}

export async function createSession(token: string, userId: string): Promise<Session> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const now = new Date();
	const session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
		createdAt: now
	};

	try {
		await db.insert(sessions).values(session);
		logger.info("Session created successfully", {
			component: "auth",
			userId,
			sessionId,
			metadata: {
				expiresAt: session.expiresAt
			}
		});
		return session;
	} catch (error) {
		logger.error("Failed to create session", {
			component: "auth",
			userId,
			metadata: { error }
		});
		throw error;
	}
}

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	
	try {
		const result = await db
			.select({
				user: users,
				session: sessions
			})
			.from(sessions)
			.innerJoin(users, eq(sessions.userId, users.id))
			.where(eq(sessions.id, sessionId));

		if (result.length < 1) {
			logger.debug("Session not found", {
				component: "auth",
				metadata: { sessionId }
			});
			return { session: null, user: null };
		}

		const { user, session } = result[0];
		
		if (Date.now() >= session.expiresAt.getTime()) {
			await db.delete(sessions).where(eq(sessions.id, sessionId));
			logger.info("Expired session deleted", {
				component: "auth",
				userId: user.id,
				sessionId,
				metadata: {
					expiredAt: session.expiresAt
				}
			});
			return { session: null, user: null };
		}

		// Renew the session if less than 15 days remain
		if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
			session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
			await db
				.update(sessions)
				.set({
					expiresAt: session.expiresAt
				})
				.where(eq(sessions.id, sessionId));
			
			logger.debug("Session renewed", {
				component: "auth",
				userId: user.id,
				sessionId,
				metadata: {
					newExpiresAt: session.expiresAt
				}
			});
		}

		logger.debug("Session validated successfully", {
			component: "auth",
			userId: user.id,
			sessionId
		});
		const {hashedPassword, ...safeUserData} = user
		return { session, user: safeUserData };
	} catch (error) {
		logger.error("Failed to validate session", {
			component: "auth",
			metadata: { error, sessionId }
		});
		return { session: null, user: null };
	}
}

export async function invalidateSession(sessionId: string): Promise<void> {
	try {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
		logger.info("Session invalidated", {
			component: "auth",
			sessionId
		});
	} catch (error) {
		logger.error("Failed to invalidate session", {
			component: "auth",
			metadata: { error, sessionId }
		});
		throw error;
	}
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date): void {
	event.cookies.set("session", token, {
		httpOnly: true,
		sameSite: "lax",
		expires: expiresAt,
		path: "/",
		secure: !dev
	});
	
	logger.debug("Session cookie set", {
		component: "auth",
		requestId: event.locals.requestId,
		metadata: {
			expiresAt
		}
	});
}

export function deleteSessionTokenCookie(event: RequestEvent): void {
	event.cookies.set("session", "", {
		httpOnly: true,
		sameSite: "lax",
		maxAge: 0,
		path: "/",
		secure: !dev
	});
	
	logger.debug("Session cookie deleted", {
		component: "auth",
		requestId: event.locals.requestId
	});
}

export type SessionValidationResult =
	| { session: Session; user: Omit<User, 'hashedPassword'> }
	| { session: null; user: null };
