import { query, getRequestEvent } from '$app/server';
import { EntitlementService } from '$lib/server/entitlement';
import { resolveTargetOwnerUserId } from '$lib/server/messages/policy';
import { subscribeToChatRoom } from '$lib/server/chat/listener';
import { presence } from '$lib/server/chat/presence';
import { maskChatEvent } from '$lib/server/chat/broadcast';
import { createAsyncQueue } from '$lib/server/chat/asyncQueue';
import { isUuid } from '$lib/server/security/uuid';
import type { ChatFrame } from '$lib/messages/types';
import type { ChatMessagePublished } from '$lib/server/chat/broadcast';

/**
 * Streams one artist chat room to whoever is connected. Subscribers get real
 * messages; everyone else gets the masked teaser (spec §4.3–4.5). Presence frames
 * (`onlineCount`, `artistOnline`) go to both, unmasked — that's the whole point of
 * the teaser: real signal, fake content.
 */
export const getChatRoom = query.live('unchecked', async function* (artistId: unknown) {
	if (!isUuid(artistId)) throw new Error('invalid_artist_id');

	const { locals, request } = getRequestEvent();
	const viewerUserId = locals.user?.id ?? null;

	const [isSubscriber, ownerUserId] = await Promise.all([
		EntitlementService.isSubscriberOf(viewerUserId, artistId),
		resolveTargetOwnerUserId('artist', artistId)
	]);
	const isArtist = Boolean(viewerUserId) && viewerUserId === ownerUserId;
	const connectionId = crypto.randomUUID();

	const queue = createAsyncQueue<ChatFrame>();

	const leavePresence = presence.join(
		artistId,
		{ connectionId, userId: viewerUserId, isArtist },
		(snapshot) => queue.push({ type: 'presence', ...snapshot })
	);
	// Seed the frame the connecting client needs immediately — otherwise the header
	// shows nothing until the next unrelated presence change.
	queue.push({ type: 'presence', ...presence.snapshot(artistId) });

	// A client-side `break` out of the consuming `for await` loop (e.g. on
	// component unmount / client-side navigation) calls `.return()` on this
	// generator, which runs `finally` below — that covers graceful teardown.
	// A hard disconnect (tab closed, network dropped) never runs client JS at
	// all, so it can only be observed here, server-side, via the request's own
	// abort signal. Without this, a connection that dies abruptly would leave
	// its presence entry (and the Postgres LISTEN it's keeping alive) stuck
	// until some other, unrelated mechanism happened to close it.
	const onAbort = () => queue.close();
	request.signal.addEventListener('abort', onAbort);

	// The try starts here, before `subscribeToChatRoom` — if it throws (the
	// LISTEN never gets established), `leavePresence()` above must still run,
	// or this connection's presence entry never clears.
	let stopListening: (() => Promise<void>) | undefined;
	try {
		stopListening = await subscribeToChatRoom(artistId, (event: ChatMessagePublished) => {
			queue.push(maskChatEvent(event, isSubscriber || isArtist));
		});

		for await (const frame of queue.iterate()) {
			yield frame;
		}
	} finally {
		request.signal.removeEventListener('abort', onAbort);
		// Nested so a rejecting stopListening() (e.g. the Postgres UNLISTEN
		// round trip failing) can't skip leavePresence()/queue.close() — a
		// throw partway through a bare finally body aborts everything after it.
		try {
			await stopListening?.();
		} finally {
			leavePresence();
			queue.close();
		}
	}
});
