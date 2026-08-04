import { expect, test } from '@playwright/test';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import postgres from 'postgres';
import { TEST_DATABASE_URL } from './test-db.mjs';

/**
 * Exercises the artist page's streaming load + entitlement gating end to end
 * against the ephemeral e2e database: anonymous viewer, logged-in non-subscriber,
 * and post-subscribe states.
 *
 * The test seeds ALL of its own fixtures (owner + artist + a subscribers-only
 * track + a subscribers post + a fan user/session) — it does not depend on any
 * pre-existing dev data. The whole `pdm_e2e` database is dropped after the run
 * (e2e/global-teardown.ts), so no per-row cleanup is needed.
 */

function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	return encodeBase32LowerCaseNoPadding(bytes);
}

function sessionIdFor(token: string): string {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

test.describe.serial('artist page subscription gating', () => {
	const sql = postgres(TEST_DATABASE_URL, { max: 1 });

	let artistSlug: string;
	let fanSessionToken: string;

	test.beforeAll(async () => {
		const stamp = Date.now();
		artistSlug = `e2e-artist-${stamp}`;

		const [owner] = await sql`
			insert into users.users (email, display_name)
			values (${`e2e-owner-${stamp}@example.test`}, 'E2E Owner')
			returning id
		`;

		const [artist] = await sql`
			insert into artist.artists (user_id, name, slug)
			values (${owner.id}, 'E2E Artist', ${artistSlug})
			returning id
		`;

		// A published, subscribers-only track — appears dimmed/locked for non-subscribers.
		await sql`
			insert into catalog.tracks (artist_id, title, status, is_published, visibility, audio_url)
			values (${artist.id}, 'E2E Track', 'ready', true, 'subscribers', ${`${artist.id}/audio/e2e.mp3`})
		`;

		// A published, subscribers-only post — shows a locked teaser for non-subscribers.
		await sql`
			insert into content.posts (artist_id, title, slug, excerpt, visibility, status, published_at)
			values (
				${artist.id},
				'E2E locked update',
				${`e2e-locked-update-${stamp}`},
				'Exclusive update for subscribers',
				'subscribers',
				'published',
				now()
			)
		`;

		const [fan] = await sql`
			insert into users.users (email, display_name)
			values (${`e2e-fan-${stamp}@example.test`}, 'E2E Fan')
			returning id
		`;

		fanSessionToken = generateSessionToken();
		await sql`
			insert into users.sessions (id, user_id, expires_at)
			values (${sessionIdFor(fanSessionToken)}, ${fan.id}, now() + interval '1 day')
		`;
	});

	test.afterAll(async () => {
		await sql.end();
	});

	test('anonymous visitor sees a log-in CTA and locked content is dimmed with a teaser', async ({
		page
	}, testInfo) => {
		await page.goto(`/artist/${artistSlug}`);

		await expect(page.getByRole('link', { name: 'Log in to subscribe' })).toBeVisible();

		const lockedFeedCard = page.locator('.feed-card.is-locked', { hasText: 'E2E locked update' });
		await expect(lockedFeedCard).toBeVisible();
		await expect(lockedFeedCard.getByText('Subscribe to unlock')).toBeVisible();

		await expect(page.locator('.music-track.is-locked')).toHaveCount(1);

		await page.screenshot({ path: testInfo.outputPath('artist-anonymous.png'), fullPage: true });
	});

	test('logged-in non-subscriber sees the Subscribe CTA; subscribing unlocks the track', async ({
		browser,
		baseURL
	}, testInfo) => {
		const context = await browser.newContext();
		await context.addCookies([
			{
				name: 'session',
				value: fanSessionToken,
				url: baseURL,
				httpOnly: true,
				secure: true,
				sameSite: 'Lax'
			}
		]);
		const page = await context.newPage();

		await page.goto(`/artist/${artistSlug}`);

		const subscribeButton = page.getByRole('button', { name: 'Subscribe · $1/mo' });
		await expect(subscribeButton).toBeVisible();
		await expect(page.locator('.music-track.is-locked')).toHaveCount(1);
		await page.screenshot({
			path: testInfo.outputPath('artist-nonsubscriber.png'),
			fullPage: true
		});

		await subscribeButton.click();
		await expect(page.getByRole('button', { name: 'Subscribed ✓' })).toBeVisible();

		// The per-track `locked` hint reflects real entitlement after invalidateAll().
		await expect(page.locator('.music-track.is-locked')).toHaveCount(0);
		await page.screenshot({ path: testInfo.outputPath('artist-subscribed.png'), fullPage: true });

		await context.close();
	});
});
