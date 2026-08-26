import { expect, test } from '@playwright/test';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import postgres from 'postgres';
import { TEST_DATABASE_URL } from './test-db.mjs';

/**
 * Exercises the realtime fan chat end to end against the ephemeral e2e database:
 * a subscriber posts a message and sees it live over the remote-function stream,
 * while a guest on the same artist page — who never opens a live connection —
 * only ever sees the static locked teaser, never the real message body. Also
 * pins the raw Postgres LISTEN/NOTIFY wiring the feature is built on.
 *
 * The test seeds all of its own fixtures. The whole `pdm_e2e` database is dropped
 * after the run (e2e/global-teardown.ts), so no per-row cleanup is needed.
 */

function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	return encodeBase32LowerCaseNoPadding(bytes);
}

function sessionIdFor(token: string): string {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

test.describe.serial('fan chat', () => {
	const sql = postgres(TEST_DATABASE_URL, { max: 1 });

	let artistId: string;
	let artistSlug: string;
	let fanSessionToken: string;

	test.beforeAll(async () => {
		const stamp = Date.now();
		artistSlug = `e2e-chat-artist-${stamp}`;

		const [owner] = await sql`
			insert into users.users (email, display_name)
			values (${`e2e-chat-owner-${stamp}@example.test`}, 'E2E Chat Owner')
			returning id
		`;
		const [artist] = await sql`
			insert into artist.artists (user_id, name, slug)
			values (${owner.id}, 'E2E Chat Artist', ${artistSlug})
			returning id
		`;
		artistId = artist.id;

		const [fan] = await sql`
			insert into users.users (email, display_name)
			values (${`e2e-chat-fan-${stamp}@example.test`}, 'E2E Fan')
			returning id
		`;
		fanSessionToken = generateSessionToken();
		await sql`
			insert into users.sessions (id, user_id, expires_at)
			values (${sessionIdFor(fanSessionToken)}, ${fan.id}, now() + interval '1 day')
		`;
		await sql`
			insert into finance.subscriptions (user_id, artist_id, status)
			values (${fan.id}, ${artistId}, 'active')
		`;
	});

	test.afterAll(async () => {
		await sql.end();
	});

	test('a subscriber posts and a guest never sees the real body — guests hold no live connection', async ({
		browser,
		baseURL
	}) => {
		const fanContext = await browser.newContext();
		await fanContext.addCookies([
			{
				name: 'session',
				value: fanSessionToken,
				url: baseURL,
				httpOnly: true,
				secure: true,
				sameSite: 'Lax'
			}
		]);
		const fanPage = await fanContext.newPage();

		const guestContext = await browser.newContext();
		const guestPage = await guestContext.newPage();

		await fanPage.goto(`/artist/${artistSlug}`);
		await guestPage.goto(`/artist/${artistSlug}`);

		// Only the fan actually connects — a guest never opens a live connection at
		// all, so presence only ever reflects the fan.
		await expect(fanPage.getByText(/1 online/)).toBeVisible();
		// The guest sees a static locked teaser instead of a presence cluster —
		// there is no live data to show them.
		await expect(guestPage.getByText(/online/)).toHaveCount(0);
		await expect(guestPage.locator('.teaser-decoration .teaser-row')).toHaveCount(14);

		const secretText = `secret-${Date.now()}`;
		await fanPage.getByPlaceholder('Message the room…').fill(secretText);
		await fanPage.getByRole('button', { name: 'Send' }).click();

		await expect(fanPage.getByText(secretText)).toBeVisible();

		// The guest's teaser is entirely static (no connection to react through in
		// the first place) — it must never surface the real body.
		await expect(guestPage.getByText(secretText)).toHaveCount(0);

		await fanContext.close();
		await guestContext.close();
	});
});

test.describe('chat LISTEN/NOTIFY wiring', () => {
	// Deliberately not mocked — this pins the real Postgres pub/sub round trip
	// `subscribeToChatRoom`/`publishChatMessage` rely on (channel naming,
	// payload delivery), the same way the suite above pins real query behavior.
	// No app fixtures needed: it only proves LISTEN/NOTIFY itself works.
	test('delivers a NOTIFY payload to a LISTEN on the same channel', async () => {
		const sql = postgres(TEST_DATABASE_URL, { max: 1 });
		try {
			const received: string[] = [];
			let notifyReceived: () => void;
			const gotNotify = new Promise<void>((resolve) => (notifyReceived = resolve));
			const { unlisten } = await sql.listen('chat_room_test-artist', (payload) => {
				received.push(payload);
				notifyReceived();
			});

			await sql.notify(
				'chat_room_test-artist',
				JSON.stringify({ kind: 'message', message: { id: 'm1' } })
			);

			// Resolves as soon as the payload actually arrives instead of guessing
			// how long delivery takes; still bounded so a real regression fails
			// the test instead of hanging the run.
			await Promise.race([
				gotNotify,
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('NOTIFY payload never arrived')), 5000)
				)
			]);
			expect(received).toEqual([JSON.stringify({ kind: 'message', message: { id: 'm1' } })]);

			await unlisten();
		} finally {
			await sql.end();
		}
	});
});
