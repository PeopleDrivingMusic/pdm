import { describe, it, expect, vi, beforeEach } from 'vitest';

const unlistenMocks: Array<ReturnType<typeof vi.fn>> = [];
const listenMock = vi.fn(async (_channel: string, _onnotify: (payload: string) => void) => {
	const unlisten = vi.fn(async () => {});
	unlistenMocks.push(unlisten);
	return { unlisten };
});

vi.mock('$lib/db', () => ({
	client: { listen: (...args: [string, (payload: string) => void]) => listenMock(...args) }
}));

import { subscribeToChatRoom } from './listener';

beforeEach(() => {
	vi.clearAllMocks();
	unlistenMocks.length = 0;
});

describe('subscribeToChatRoom', () => {
	it('opens exactly one Postgres LISTEN for two subscribers of the same room', async () => {
		await subscribeToChatRoom('artist-1', () => {});
		await subscribeToChatRoom('artist-1', () => {});

		expect(listenMock).toHaveBeenCalledTimes(1);
		expect(listenMock).toHaveBeenCalledWith('chat_room_artist-1', expect.any(Function));
	});

	it('fans a single NOTIFY out to every subscriber of the room', async () => {
		const received1: unknown[] = [];
		const received2: unknown[] = [];
		await subscribeToChatRoom('artist-2', (event) => received1.push(event));
		await subscribeToChatRoom('artist-2', (event) => received2.push(event));

		const onnotify = listenMock.mock.calls[0][1] as (payload: string) => void;
		onnotify(JSON.stringify({ kind: 'message', message: { id: 'm1' } }));

		expect(received1).toEqual([{ kind: 'message', message: { id: 'm1' } }]);
		expect(received2).toEqual([{ kind: 'message', message: { id: 'm1' } }]);
	});

	it('keeps the LISTEN open while at least one subscriber remains', async () => {
		const unsubscribe1 = await subscribeToChatRoom('artist-3', () => {});
		await subscribeToChatRoom('artist-3', () => {});

		await unsubscribe1();

		expect(unlistenMocks[0]).not.toHaveBeenCalled();
	});

	it('unlistens once the last subscriber of a room leaves', async () => {
		const unsubscribe1 = await subscribeToChatRoom('artist-4', () => {});
		const unsubscribe2 = await subscribeToChatRoom('artist-4', () => {});

		await unsubscribe1();
		await unsubscribe2();

		expect(unlistenMocks[0]).toHaveBeenCalledTimes(1);
	});

	it('opens a fresh LISTEN if a room is rejoined after everyone left', async () => {
		const unsubscribe1 = await subscribeToChatRoom('artist-5', () => {});
		await unsubscribe1();

		await subscribeToChatRoom('artist-5', () => {});

		expect(listenMock).toHaveBeenCalledTimes(2);
	});

	it('opens exactly one LISTEN when two subscribers race the first join', async () => {
		const received1: unknown[] = [];
		const received2: unknown[] = [];

		// Neither call is awaited before the other starts — both see no existing
		// room and would each try to create one without the in-flight dedup.
		const [unsubscribe1, unsubscribe2] = await Promise.all([
			subscribeToChatRoom('artist-race', (event) => received1.push(event)),
			subscribeToChatRoom('artist-race', (event) => received2.push(event))
		]);

		expect(listenMock).toHaveBeenCalledTimes(1);

		const onnotify = listenMock.mock.calls[0][1] as (payload: string) => void;
		onnotify(JSON.stringify({ kind: 'message', message: { id: 'm1' } }));
		expect(received1).toEqual([{ kind: 'message', message: { id: 'm1' } }]);
		expect(received2).toEqual([{ kind: 'message', message: { id: 'm1' } }]);

		// Both subscribers landed on the same room, so it takes both leaving to
		// unlisten — a leaked second listener would never receive this cleanup.
		await unsubscribe1();
		expect(unlistenMocks[0]).not.toHaveBeenCalled();
		await unsubscribe2();
		expect(unlistenMocks[0]).toHaveBeenCalledTimes(1);
	});

	it('propagates a failed LISTEN to the caller and allows a clean retry', async () => {
		listenMock.mockRejectedValueOnce(new Error('connection refused'));

		await expect(subscribeToChatRoom('artist-fail', () => {})).rejects.toThrow(
			'connection refused'
		);

		// The failed attempt's in-flight creation entry must have been cleared —
		// otherwise a retry would hang awaiting (or reject from) the same stale
		// promise instead of opening a fresh LISTEN.
		await subscribeToChatRoom('artist-fail', () => {});
		expect(listenMock).toHaveBeenCalledTimes(2);
	});

	it('keeps different rooms on separate LISTEN channels', async () => {
		await subscribeToChatRoom('artist-6', () => {});
		await subscribeToChatRoom('artist-7', () => {});

		expect(listenMock).toHaveBeenCalledWith('chat_room_artist-6', expect.any(Function));
		expect(listenMock).toHaveBeenCalledWith('chat_room_artist-7', expect.any(Function));
	});
});
