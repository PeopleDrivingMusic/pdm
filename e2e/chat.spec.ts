import { expect, test } from '@playwright/test';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import postgres from 'postgres';
import { TEST_DATABASE_URL } from './test-db.mjs';

/**
 * Exercises the realtime fan chat end to end against the ephemeral e2e database:
 * a subscriber posts a message, a second subscribed session sees it live over the
 * remote-function stream, and a guest on the same artist page sees only the
 * reacting teaser (never the real message body).
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

	test('a subscriber posts and a guest sees the teaser react without the real body', async ({
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

		// Both viewers need to be online for the presence count to reach 2 before
		// the fan posts — otherwise the guest's snapshot can race the fan's join.
		await expect(fanPage.getByText(/2 online/)).toBeVisible();
		await expect(guestPage.getByText(/2 online/)).toBeVisible();

		const secretText = `secret-${Date.now()}`;
		await fanPage.getByPlaceholder('Message the room…').fill(secretText);
		await fanPage.getByRole('button', { name: 'Send' }).click();

		await expect(fanPage.getByText(secretText)).toBeVisible();

		// The guest must never see the real body — only a reacting teaser row —
		// and the online count must reflect both connected viewers.
		await expect(guestPage.locator('.teaser-row')).toHaveCount(1, { timeout: 5000 });
		await expect(guestPage.getByText(secretText)).toHaveCount(0);
		await expect(guestPage.getByText(/2 online/)).toBeVisible();

		await fanContext.close();
		await guestContext.close();
	});
});
