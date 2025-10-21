import { generateSessionToken, createSession, setSessionTokenCookie } from "$lib/server/session";
import { UserService } from "$lib/db/queries";
import { google } from "$lib/server/oauth";
import { decodeIdToken } from "arctic";
import { logger } from "$lib/utils/logger";
import type { RequestEvent } from "@sveltejs/kit";
import type { OAuth2Tokens } from "arctic";

export async function GET(event: RequestEvent): Promise<Response> {
	const code = event.url.searchParams.get("code");
	const state = event.url.searchParams.get("state");
	const storedState = event.cookies.get("google_oauth_state") ?? null;
	const codeVerifier = event.cookies.get("google_code_verifier") ?? null;
	
	// Check for presence of all required parameters
	if (code === null || state === null || storedState === null || codeVerifier === null) {
		logger.security("OAuth callback missing required parameters", "warn", {
			requestId: event.locals.requestId,
			metadata: {
				hasCode: code !== null,
				hasState: state !== null,
				hasStoredState: storedState !== null,
				hasCodeVerifier: codeVerifier !== null
			}
		});
		
		return new Response(null, {
			status: 302,
			headers: {
				Location: "/login?error=oauth_error"
			}
		});
	}
	
	// Verify the state parameter to protect against CSRF
	if (state !== storedState) {
		logger.security("OAuth state mismatch", "warn", {
			requestId: event.locals.requestId,
			metadata: { state, storedState }
		});
		
		return new Response(null, {
			status: 302,
			headers: {
				Location: "/login?error=oauth_error"
			}
		});
	}

	let tokens: OAuth2Tokens;
	try {
		// Exchange the authorization code for tokens
		tokens = await google.validateAuthorizationCode(code, codeVerifier);
		
		logger.debug("Successfully exchanged authorization code for tokens", {
			component: "auth",
			requestId: event.locals.requestId
		});
	} catch (error) {
		logger.error("Failed to validate authorization code", {
			component: "auth",
			requestId: event.locals.requestId,
			metadata: { error }
		});
		
		return new Response(null, {
			status: 302,
			headers: {
				Location: "/login?error=oauth_error"
			}
		});
	}

	let claims: any;
	try {
		// Decode the ID token to obtain user information
		claims = decodeIdToken(tokens.idToken());
		
		logger.debug("Successfully decoded ID token", {
			component: "auth",
			requestId: event.locals.requestId,
			metadata: {
				sub: claims.sub,
				email: claims.email,
				name: claims.name
			}
		});
	} catch (error) {
		logger.error("Failed to decode ID token", {
			component: "auth",
			requestId: event.locals.requestId,
			metadata: { error }
		});
		
		return new Response(null, {
			status: 302,
			headers: {
				Location: "/login?error=oauth_error"
			}
		});
	}

	const googleUserId = claims.sub;
	const email = claims.email;
	const name = claims.name;
	const picture = claims.picture;

	if (!googleUserId || !email) {
		logger.error("Missing required claims from Google ID token", {
			component: "auth",
			requestId: event.locals.requestId,
			metadata: { hasGoogleUserId: !!googleUserId, hasEmail: !!email }
		});
		
		return new Response(null, {
			status: 302,
			headers: {
				Location: "/login?error=oauth_error"
			}
		});
	}

	try {
		// Find existing user by Google ID
		let user = await UserService.getUserFromGoogleId(googleUserId);

		if (user !== null) {
			// User already exists - update avatar if it's new
			if (picture && !user.avatarUrl) {
				const updatedUser = await UserService.updateUser(user.id, {
					avatarUrl: picture,
					displayName: name || user.displayName // Update name if provided
				});
				
				if (updatedUser) {
					user = updatedUser;
					logger.info("Updated user avatar from Google", {
						component: "auth",
						userId: user.id,
						requestId: event.locals.requestId,
						metadata: {
							oldAvatarUrl: user.avatarUrl,
							newAvatarUrl: picture
						}
					});
				}
			}
			
			logger.info("Existing user logged in via Google", {
				component: "auth",
				userId: user.id,
				requestId: event.locals.requestId,
				metadata: {
					email: user.email,
					loginMethod: 'google_oauth'
				}
			});
		} else {
			// Create a new user
			user = await UserService.createUser({
				email: email.toLowerCase(),
				displayName: name,
				googleId: googleUserId,
				avatarUrl: picture
			});

			logger.info("New user created via Google OAuth", {
				component: "auth",
				userId: user.id,
				requestId: event.locals.requestId,
				metadata: {
					email: user.email,
					displayName: user.displayName,
					loginMethod: 'google_oauth'
				}
			});
		}

		// Ensure the user was created or found
		if (!user) {
			logger.error("Failed to create or retrieve user during Google OAuth", {
				component: "auth",
				requestId: event.locals.requestId,
				metadata: { email, googleUserId }
			});
			
			return new Response(null, {
				status: 302,
				headers: {
					Location: "/login?error=oauth_error"
				}
			});
		}

		// Create session
		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, user.id);
		setSessionTokenCookie(event, sessionToken, session.expiresAt);

		// Clear OAuth cookies
		event.cookies.delete("google_oauth_state", { path: "/" });
		event.cookies.delete("google_code_verifier", { path: "/" });

		logger.info("User successfully authenticated via Google OAuth", {
			component: "auth",
			userId: user.id,
			sessionId: session.id,
			requestId: event.locals.requestId
		});

		return new Response(null, {
			status: 302,
			headers: {
				Location: "/"
			}
		});
	} catch (error) {
		logger.error("Error during Google OAuth callback processing", {
			component: "auth",
			requestId: event.locals.requestId,
			metadata: { error, email, googleUserId }
		});

		return new Response(null, {
			status: 302,
			headers: {
				Location: "/login?error=oauth_error"
			}
		});
	}
}
