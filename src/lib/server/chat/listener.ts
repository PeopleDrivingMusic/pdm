import { client } from '$lib/db';
import type { ChatMessagePublished } from './broadcast';

interface RoomListener {
	unlisten: () => Promise<void>;
	subscribers: Set<(event: ChatMessagePublished) => void>;
}

/**
 * Ref-counted `LISTEN` per artist room: the first subscriber opens the Postgres
 * channel, every later subscriber for the same room reuses it, and the last one to
 * leave closes it. `postgres-js` maintains its own dedicated connection for
 * `.listen()` automatically — this map only dedupes at the application level so N
 * subscribers of the same room don't open N separate LISTENs.
 */
const roomListeners = new Map<string, RoomListener>();

export async function subscribeToChatRoom(
	artistId: string,
	onMessage: (event: ChatMessagePublished) => void
): Promise<() => Promise<void>> {
	let room = roomListeners.get(artistId);
	if (!room) {
		const subscribers = new Set<(event: ChatMessagePublished) => void>();
		const { unlisten } = await client.listen(`chat_room_${artistId}`, (payload: string) => {
			const event = JSON.parse(payload) as ChatMessagePublished;
			for (const subscriber of subscribers) subscriber(event);
		});
		room = { unlisten, subscribers };
		roomListeners.set(artistId, room);
	}
	room.subscribers.add(onMessage);

	let left = false;
	return async () => {
		if (left) return;
		left = true;
		const current = roomListeners.get(artistId);
		if (!current) return;
		current.subscribers.delete(onMessage);
		if (current.subscribers.size === 0) {
			roomListeners.delete(artistId);
			await current.unlisten();
		}
	};
}
