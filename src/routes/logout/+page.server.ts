import { fail, redirect } from "@sveltejs/kit";
import { invalidateSession, deleteSessionTokenCookie } from "$lib/server/session";
import { logger } from "$lib/utils/logger";
import type { RequestEvent } from "@sveltejs/kit";

export const actions = {
	default: async (event: RequestEvent) => {
		if (event.locals.session === null) {
			logger.warn("Logout attempt without active session", {
				component: "auth",
				requestId: event.locals.requestId
			});
			
			return fail(401, {
				error: "No active session"
			});
		}

		const sessionId = event.locals.session.id;
		const userId = event.locals.user?.id;

		try {
			await invalidateSession(sessionId);
			deleteSessionTokenCookie(event);

			logger.info("User logged out successfully", {
				component: "auth",
				userId,
				sessionId,
				requestId: event.locals.requestId
			});

			throw redirect(302, "/login");
		} catch (error) {
			if (error instanceof Response && error.status === 302) {
				// Re-throw redirect responses
				throw error;
			}

			logger.error("Logout error", {
				component: "auth",
				userId,
				sessionId,
				requestId: event.locals.requestId,
				metadata: { error }
			});

			return fail(500, {
				error: "Logout error"
			});
		}
	}
};
