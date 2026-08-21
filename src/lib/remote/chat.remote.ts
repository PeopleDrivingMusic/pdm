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

	const { locals } = getRequestEvent();
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

	const stopListening = await subscribeToChatRoom(artistId, (event: ChatMessagePublished) => {
		queue.push(maskChatEvent(event, isSubscriber));
	});

	try {
		for await (const frame of queue.iterate()) {
			yield frame;
		}
	} finally {
		await stopListening();
		leavePresence();
		queue.close();
	}
});
