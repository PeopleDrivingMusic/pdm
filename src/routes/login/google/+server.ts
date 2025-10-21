import { generateState, generateCodeVerifier } from "arctic";
import { google } from "$lib/server/oauth";
import { logger } from "$lib/utils/logger";
import type { RequestEvent } from "@sveltejs/kit";

export async function GET(event: RequestEvent): Promise<Response> {
	try {
		const state = generateState();
		const codeVerifier = generateCodeVerifier();
		const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"]);

		// Save state and codeVerifier in cookies for verification in the callback
		event.cookies.set("google_oauth_state", state, {
			path: "/",
			httpOnly: true,
			maxAge: 60 * 10, // 10 minutes
			sameSite: "lax",
			secure: !event.url.hostname.includes('localhost')
		});
		
		event.cookies.set("google_code_verifier", codeVerifier, {
			path: "/",
			httpOnly: true,
			maxAge: 60 * 10, // 10 minutes
			sameSite: "lax",
			secure: !event.url.hostname.includes('localhost')
		});

		logger.info("Google OAuth flow initiated", {
			component: "auth",
			requestId: event.locals.requestId,
			metadata: {
				state,
				redirectUrl: url.toString()
			}
		});

		return new Response(null, {
			status: 302,
			headers: {
				Location: url.toString()
			}
		});
	} catch (error) {
		logger.error("Failed to initiate Google OAuth flow", {
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
}
