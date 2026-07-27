import 'dotenv/config';
import { expect, test } from '@playwright/test';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import postgres from 'postgres';

/**
 * Exercises the artist page's streaming load + gating end to end against the real
 * dev database: anonymous viewer, logged-in non-subscriber, and post-subscribe states.
 *
 * Seeds a throwaway fan user/session and temporarily locks one artist track + adds a
 * subscribers-only post, then restores everything in afterAll.
 */

const ARTIST_SLUG = 'metallica';

function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	return encodeBase32LowerCaseNoPadding(bytes);
}

function sessionIdFor(token: string): string {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

test.describe.serial('artist page subscription gating', () => {
	const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

	let artistId: string;
	let lockedTrackId: string;
	let originalTrackVisibility: string;
	let lockedPostId: string;
	let fanUserId: string;
	let sessionToken: string;

	test.beforeAll(async () => {
		const [artist] = await sql`select id from artist.artists where slug = ${ARTIST_SLUG}`;
		if (!artist) throw new Error(`Seed artist "${ARTIST_SLUG}" not found — cannot run e2e fixture`);
		artistId = artist.id;

		const [track] = await sql`
			select id, visibility from catalog.tracks
			where artist_id = ${artistId} and is_published = true
			limit 1
		`;
		if (!track) throw new Error(`Seed artist "${ARTIST_SLUG}" has no published track to lock`);
		lockedTrackId = track.id;
		originalTrackVisibility = track.visibility;
		await sql`update catalog.tracks set visibility = 'subscribers_only' where id = ${lockedTrackId}`;

		const [post] = await sql`
			insert into content.posts (artist_id, title, slug, excerpt, visibility, status, published_at)
			values (
				${artistId},
				'E2E locked update',
				${'e2e-locked-update-' + Date.now()},
				'Exclusive update for subscribers',
				'subscribers',
				'published',
				now()
			)
			returning id
		`;
		lockedPostId = post.id;

		const email = `e2e-fan-${Date.now()}@example.test`;
		const [user] = await sql`
			insert into users.users (email, display_name)
			values (${email}, 'E2E Fan')
			returning id
		`;
		fanUserId = user.id;

		sessionToken = generateSessionToken();
		await sql`
			insert into users.sessions (id, user_id, expires_at)
			values (${sessionIdFor(sessionToken)}, ${fanUserId}, now() + interval '1 day')
		`;
	});

	test.afterAll(async () => {
		await sql`delete from finance.subscriptions where user_id = ${fanUserId}`;
		await sql`delete from users.sessions where user_id = ${fanUserId}`;
		await sql`delete from users.users where id = ${fanUserId}`;
		await sql`delete from content.posts where id = ${lockedPostId}`;
		await sql`update catalog.tracks set visibility = ${originalTrackVisibility} where id = ${lockedTrackId}`;
		await sql.end();
	});

	test('anonymous visitor sees a log-in CTA and locked content is dimmed with a teaser', async ({
		page
	}) => {
		await page.goto(`/artist/${ARTIST_SLUG}`);

		await expect(page.getByRole('link', { name: 'Log in to subscribe' })).toBeVisible();

		const lockedFeedCard = page.locator('.feed-card.is-locked', { hasText: 'E2E locked update' });
		await expect(lockedFeedCard).toBeVisible();
		await expect(lockedFeedCard.getByText('Subscribe to unlock')).toBeVisible();

		await expect(page.locator('.music-track.is-locked')).toHaveCount(1);
	});

	test('logged-in non-subscriber sees the Subscribe CTA; subscribing unlocks the track', async ({
		browser,
		baseURL
	}) => {
		const context = await browser.newContext();
		await context.addCookies([
			{
				name: 'session',
				value: sessionToken,
				url: baseURL,
				httpOnly: true,
				secure: true,
				sameSite: 'Lax'
			}
		]);
		const page = await context.newPage();

		await page.goto(`/artist/${ARTIST_SLUG}`);

		const subscribeButton = page.getByRole('button', { name: 'Subscribe · $1/mo' });
		await expect(subscribeButton).toBeVisible();
		await expect(page.locator('.music-track.is-locked')).toHaveCount(1);

		await subscribeButton.click();
		await expect(page.getByRole('button', { name: 'Subscribed ✓' })).toBeVisible();

		// The per-track `locked` hint reflects real entitlement after invalidateAll().
		await expect(page.locator('.music-track.is-locked')).toHaveCount(0);

		await context.close();
	});
});
