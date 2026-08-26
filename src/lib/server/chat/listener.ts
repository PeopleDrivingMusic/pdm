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
// Two callers can both find no room and both start creating one before either
// finishes `await client.listen(...)` — without this, that race opens two
// LISTENs for the same channel and the second caller's `roomListeners.set`
// silently orphans the first's subscriber set (and its LISTEN, forever). Later
// callers for the same artistId while creation is in flight await this same
// promise instead of starting their own.
const roomCreations = new Map<string, Promise<RoomListener>>();

export async function subscribeToChatRoom(
	artistId: string,
	onMessage: (event: ChatMessagePublished) => void
): Promise<() => Promise<void>> {
	let room = roomListeners.get(artistId);
	if (!room) {
		let creating = roomCreations.get(artistId);
		if (!creating) {
			creating = (async () => {
				const subscribers = new Set<(event: ChatMessagePublished) => void>();
				const { unlisten } = await client.listen(`chat_room_${artistId}`, (payload: string) => {
					const event = JSON.parse(payload) as ChatMessagePublished;
					for (const subscriber of subscribers) subscriber(event);
				});
				const created: RoomListener = { unlisten, subscribers };
				roomListeners.set(artistId, created);
				return created;
			})();
			roomCreations.set(artistId, creating);
			// Whether it succeeds or fails, this promise no longer represents an
			// in-flight creation — clear it so a room rejoined later (or a failed
			// attempt retried) doesn't reuse a stale settled promise.
			creating.finally(() => {
				if (roomCreations.get(artistId) === creating) roomCreations.delete(artistId);
			});
		}
		room = await creating;
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
