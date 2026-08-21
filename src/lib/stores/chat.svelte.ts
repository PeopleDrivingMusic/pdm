// src/lib/stores/chat.svelte.ts
import { getChatRoom } from '$lib/remote/chat.remote';
import type { ChatFrame } from '$lib/messages/types';

interface RoomState {
	messages: ChatFrame[];
	onlineCount: number;
	artistOnline: boolean;
}

function createRoomState(): RoomState {
	return { messages: [], onlineCount: 0, artistOnline: false };
}

/**
 * Platform-wide chat connections for a logged-in subscriber. Opened once per
 * subscribed artist from the root layout and kept alive across client-side
 * navigation — "online" means "on the platform," not "looking at this chat right
 * now" (spec §1, Locked decision 4). Guests never use this store; their connection
 * is page-scoped, owned directly by `ChatWidget`.
 */
class ChatStore {
	rooms = $state<Record<string, RoomState>>({});
	#cancelled = new Map<string, { value: boolean }>();

	open(artistId: string): void {
		if (this.#cancelled.has(artistId)) return;
		this.rooms[artistId] = createRoomState();

		const flag = { value: false };
		this.#cancelled.set(artistId, flag);

		(async () => {
			for await (const frame of getChatRoom(artistId)) {
				if (flag.value) break;
				const state = this.rooms[artistId];
				if (!state) continue;
				if (frame.type === 'presence') {
					state.onlineCount = frame.onlineCount;
					state.artistOnline = frame.artistOnline;
				} else {
					state.messages = [...state.messages, frame];
				}
			}
		})();
	}

	close(artistId: string): void {
		const flag = this.#cancelled.get(artistId);
		if (flag) flag.value = true;
		this.#cancelled.delete(artistId);
		delete this.rooms[artistId];
	}

	closeAll(): void {
		for (const artistId of [...this.#cancelled.keys()]) this.close(artistId);
	}
}

export const chatStore = new ChatStore();
