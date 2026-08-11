import { expect, test } from '@playwright/test';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import postgres from 'postgres';
import { TEST_DATABASE_URL } from './test-db.mjs';

/**
 * Exercises comments end to end against the ephemeral e2e database: public read for
 * anonymous visitors, posting/editing/deleting as a logged-in listener, and the
 * link policy. This is also what pins the real query behaviour the unit tests mock —
 * `CommentRepository` (ordering, soft-delete filtering, grouped counts) and the
 * compute-on-read `commentCount` wired into the artist page load.
 *
 * The test seeds all of its own fixtures; the whole `pdm_e2e` database is dropped
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

test.describe.serial('post comments', () => {
	const sql = postgres(TEST_DATABASE_URL, { max: 1 });

	let artistSlug: string;
	let postId: string;
	let fanSessionToken: string;

	test.beforeAll(async () => {
		const stamp = Date.now();
		artistSlug = `e2e-comments-artist-${stamp}`;

		const [owner] = await sql`
			insert into users.users (email, display_name)
			values (${`e2e-comments-owner-${stamp}@example.test`}, 'E2E Owner')
			returning id
		`;

		const [artist] = await sql`
			insert into artist.artists (user_id, name, slug)
			values (${owner.id}, 'E2E Comments Artist', ${artistSlug})
			returning id
		`;

		const [post] = await sql`
			insert into content.posts (artist_id, title, slug, excerpt, visibility, status, published_at)
			values (
				${artist.id},
				'E2E commentable post',
				${`e2e-commentable-${stamp}`},
				'Say something about this',
				'public',
				'published',
				now()
			)
			returning id
		`;
		postId = post.id;

		const [fan] = await sql`
			insert into users.users (email, display_name)
			values (${`e2e-comments-fan-${stamp}@example.test`}, 'E2E Fan')
			returning id
		`;

		// An existing comment so the anonymous read path has something to show.
		await sql`
			insert into messages.comments (target_type, target_id, author_id, body)
			values ('post', ${postId}, ${fan.id}, 'Seeded opening comment')
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

	test('anonymous visitor can read comments but is prompted to log in', async ({
		page
	}, testInfo) => {
		await page.goto(`/artist/${artistSlug}`);
		await page.locator('button.tab', { hasText: 'Posts' }).click();

		// The count comes from the server load (compute-on-read commentCount).
		const toggle = page.getByRole('button', { name: 'Comments' }).first();
		await expect(toggle).toContainText('1');

		await toggle.click();
		await expect(page.getByText('Seeded opening comment')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Log in to comment' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Send' })).toHaveCount(0);

		await page.screenshot({ path: testInfo.outputPath('comments-anonymous.png'), fullPage: true });
	});

	test('a listener can post, edit and delete their own comment', async ({
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
		await page.locator('button.tab', { hasText: 'Posts' }).click();

		const toggle = page.getByRole('button', { name: 'Comments' }).first();
		await toggle.click();
		await expect(page.getByText('Seeded opening comment')).toBeVisible();

		// Post a comment — it prepends and the count goes up.
		await page.getByRole('textbox', { name: 'Add a comment…' }).fill('Loving this one');
		await page.getByRole('button', { name: 'Send' }).click();
		await expect(page.getByText('Loving this one')).toBeVisible();
		await expect(toggle).toContainText('2');
		await page.screenshot({ path: testInfo.outputPath('comments-posted.png'), fullPage: true });

		// The link policy refuses a URL from a non-owner, inline.
		await page.getByRole('textbox', { name: 'Add a comment…' }).fill('check scam.com out');
		await page.getByRole('button', { name: 'Send' }).click();
		await expect(page.getByText(/only the artist can post links/i)).toBeVisible();
		await expect(toggle).toContainText('2');

		// Edit the comment — row actions live behind the overflow menu.
		await page.getByRole('button', { name: 'More actions' }).first().click();
		await page.getByRole('button', { name: 'Edit comment' }).first().click();
		await page.getByRole('textbox', { name: 'Edit comment' }).fill('Loving this one, actually');
		await page.getByRole('button', { name: 'Save' }).click();
		await expect(page.getByText('Loving this one, actually')).toBeVisible();
		await expect(page.getByText('(edited)')).toBeVisible();

		// Delete it — it disappears and the count drops back.
		await page.getByRole('button', { name: 'More actions' }).first().click();
		await page.getByRole('button', { name: 'Delete comment' }).first().click();
		await expect(page.getByText('Loving this one, actually')).toHaveCount(0);
		await expect(toggle).toContainText('1');

		await context.close();
	});

	test('a soft-deleted comment stays out of the count on a fresh load', async ({ page }) => {
		await page.goto(`/artist/${artistSlug}`);
		await page.locator('button.tab', { hasText: 'Posts' }).click();

		// Only the seeded comment survives the previous test's delete.
		await expect(page.getByRole('button', { name: 'Comments' }).first()).toContainText('1');
	});
});
