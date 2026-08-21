import { EventEmitter } from 'node:events';

export interface PresenceEntry {
	connectionId: string;
	userId: string | null;
	isArtist: boolean;
}

export interface PresenceSnapshot {
	onlineCount: number;
	artistOnline: boolean;
}

/**
 * Who is currently connected to each artist's chat room. In-memory only, scoped to
 * this Node process — presence is "right now," never persisted, and a process
 * restart correctly resets it to empty. See spec §4.4 for the full reasoning
 * (multi-instance fan-out via Redis is a named future trigger, not built here).
 */
const rooms = new Map<string, Set<PresenceEntry>>();
const emitter = new EventEmitter();

function channelFor(artistId: string): string {
	return `presence:${artistId}`;
}

export function snapshot(artistId: string): PresenceSnapshot {
	const entries = rooms.get(artistId);
	if (!entries || entries.size === 0) return { onlineCount: 0, artistOnline: false };

	let artistOnline = false;
	for (const entry of entries) {
		if (entry.isArtist) {
			artistOnline = true;
			break;
		}
	}
	return { onlineCount: entries.size, artistOnline };
}

/** Register a connection in a room and subscribe to future presence changes for
 *  that room. Returns a `leave` callback — call it exactly once, on disconnect. */
export function join(
	artistId: string,
	entry: PresenceEntry,
	onChange: (next: PresenceSnapshot) => void
): () => void {
	let entries = rooms.get(artistId);
	if (!entries) {
		entries = new Set();
		rooms.set(artistId, entries);
	}
	entries.add(entry);

	const listener = (next: PresenceSnapshot) => onChange(next);
	emitter.on(channelFor(artistId), listener);
	emitter.emit(channelFor(artistId), snapshot(artistId));

	let left = false;
	return () => {
		if (left) return;
		left = true;
		emitter.off(channelFor(artistId), listener);
		entries!.delete(entry);
		if (entries!.size === 0) rooms.delete(artistId);
		emitter.emit(channelFor(artistId), snapshot(artistId));
	};
}

export const presence = { join, snapshot };
