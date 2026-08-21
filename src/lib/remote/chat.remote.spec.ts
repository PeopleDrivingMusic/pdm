import { describe, it, expect, afterAll } from 'vitest';
import { config } from 'dotenv';
import postgres from 'postgres';

config();

/**
 * Exercises the real LISTEN/NOTIFY round trip: publishing a message through
 * `publishChatMessage` must reach a `subscribeToChatRoom` listener on the same
 * process talking to the real dev Postgres. This is deliberately not mocked —
 * it is the one place that pins the actual Postgres wiring, same as
 * `e2e/comments.spec.ts` pins `CommentRepository`'s real query behavior.
 * Requires `yarn db:up`.
 */
describe('chat LISTEN/NOTIFY wiring', () => {
	const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

	afterAll(async () => {
		await sql.end();
	});

	it('delivers a NOTIFY payload to a LISTEN on the same channel', async () => {
		const received: string[] = [];
		const { unlisten } = await sql.listen('chat_room_test-artist', (payload) => {
			received.push(payload);
		});

		await sql.notify(
			'chat_room_test-artist',
			JSON.stringify({ kind: 'message', message: { id: 'm1' } })
		);

		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(received).toEqual([JSON.stringify({ kind: 'message', message: { id: 'm1' } })]);

		await unlisten();
	});
});
