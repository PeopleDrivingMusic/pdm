import { json } from '@sveltejs/kit';
import { ChatService } from '$lib/server/chat';
import {
	requireSameOrigin,
	requireUser,
	isGuardResponse,
	tooManyRequests
} from '$lib/server/security/guards';
import { isUuid } from '$lib/server/security/uuid';
import {
	chatRoomWriteLimiter,
	chatGlobalWriteLimiter,
	chatWriteKey
} from '$lib/server/chat/rateLimits';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const artistId = event.url.searchParams.get('artistId');
	if (!isUuid(artistId)) return json({ error: 'invalid_request' }, { status: 400 });

	// `before` is the client's own oldest-loaded message's `createdAt` (ISO string),
	// used as a keyset cursor to page further back into history.
	const beforeParam = event.url.searchParams.get('before');
	let before: Date | undefined;
	if (beforeParam !== null) {
		before = new Date(beforeParam);
		if (Number.isNaN(before.getTime())) return json({ error: 'invalid_request' }, { status: 400 });
	}

	const result = await ChatService.getMessages({
		artistId,
		viewerUserId: event.locals.user?.id ?? null,
		before
	});
	if (!result.ok) return json({ error: result.reason }, { status: 403 });
	return json({ messages: result.messages });
};

export const POST: RequestHandler = async (event) => {
	const origin = requireSameOrigin(event);
	if (origin) return origin;
	const auth = requireUser(event);
	if (isGuardResponse(auth)) return auth;

	const payload = await event.request.json().catch(() => null);
	if (!isUuid(payload?.artistId) || typeof payload?.body !== 'string') {
		return json({ error: 'invalid_request' }, { status: 400 });
	}

	// Metered after the payload parses, because the per-room key needs a real artistId —
	// a malformed body is a 400, never a 429. Both limiters must pass: the per-room one
	// is the conversational cap, and the global one is the only thing that sees a spammer
	// spreading the same volume across hundreds of seeded rooms.
	//
	// Global FIRST, and the order is load-bearing rather than stylistic. `check()` inserts
	// a window as a side effect, and the room key contains a caller-supplied artistId that
	// is only shape-checked here — the artist is not resolved until inside the service. As
	// the left operand the room limiter would run on every request including refused ones,
	// so an account rotating random UUIDs would insert an unbounded number of live windows
	// and drive the limiter's O(n) prune scan. Metering the user first caps new room keys
	// at that user's global allowance.
	if (
		!chatGlobalWriteLimiter.check(auth.userId) ||
		!chatRoomWriteLimiter.check(chatWriteKey(auth.userId, payload.artistId))
	) {
		return tooManyRequests();
	}

	const user = event.locals.user;
	const result = await ChatService.create({
		artistId: payload.artistId,
		authorId: auth.userId,
		// `requireUser` above already gated on this same `event.locals.user?.id`, so `user`
		// is provably defined here — the assertion removes an unreachable optional-chain
		// branch rather than leaving dead code coverage can never exercise.
		authorName: user!.displayName ?? null,
		authorUsername: user!.username ?? null,
		authorAvatar: user!.avatarUrl ?? null,
		body: payload.body
	});

	if (result.ok) return json({ message: result.message }, { status: 201 });

	const status = result.reason === 'not_subscribed' ? 403 : 400;
	return json({ error: result.reason }, { status });
};
