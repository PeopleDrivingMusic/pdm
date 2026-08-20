import { client } from '$lib/db';
import { logger } from '$lib/utils/logger';
import type { ChatDTO, ChatFrame } from '$lib/messages/types';

export interface ChatMessagePublished {
	kind: 'message';
	message: ChatDTO;
}

/** Publish a newly created chat message to every live listener of the room. Fire
 *  and forget from the caller's perspective — NOTIFY delivery is best-effort by
 *  design; the message itself is already durably committed by the time this runs. */
export function publishChatMessage(artistId: string, message: ChatDTO): void {
	const event: ChatMessagePublished = { kind: 'message', message };
	void client.notify(`chat_room_${artistId}`, JSON.stringify(event)).catch((err) => {
		logger.warn('Failed to publish chat message via NOTIFY', {
			component: 'chat',
			metadata: { artistId, messageId: message.id, error: err }
		});
	});
}

/**
 * The access boundary for realtime chat content. A non-subscriber must never
 * receive a real body or author over the wire — this is where that's enforced,
 * server-side, before the frame is serialized to the client.
 */
export function maskChatEvent(event: ChatMessagePublished, viewerIsSubscriber: boolean): ChatFrame {
	if (viewerIsSubscriber) {
		return { type: 'message', message: event.message };
	}
	return {
		type: 'teaser',
		teaser: { id: event.message.id, createdAt: event.message.createdAt }
	};
}
