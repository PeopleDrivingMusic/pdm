import { expect, test } from '@playwright/test';

const OUT =
	'C:/Users/USER/AppData/Local/Temp/claude/D--IT-pet-projects-PDM-pdm/a6cc1a51-3f9d-4c52-9959-dc0ea573b2a9/scratchpad';

test.describe('post rendering preview', () => {
	test('renders every post variation with correct media layout', async ({ page }) => {
		await page.goto('/dev/post-preview');

		await expect(
			page.getByRole('heading', { name: 'Post rendering — static variations' })
		).toBeVisible();
		await expect(page.locator('[data-variation]')).toHaveCount(9);

		// Six-photo post: all six photos render (masonry, no cap) in the web column.
		const sixWeb = page.locator('[data-variation="six-photos"] [data-width="web"]');
		await expect(sixWeb.locator('.tile')).toHaveCount(6);

		// Locked post shows the teaser and hides its media.
		const lockedWeb = page.locator('[data-variation="locked"] [data-width="web"]');
		await expect(lockedWeb.getByText('Subscribe to unlock')).toBeVisible();
		await expect(lockedWeb.locator('.tile')).toHaveCount(0);
	});

	test('lightbox opens from a photo, shows a counter, and closes', async ({ page }) => {
		await page.goto('/dev/post-preview');

		const sixWeb = page.locator('[data-variation="six-photos"] [data-width="web"]');
		await sixWeb.locator('.tile').last().click();

		const dialog = page.getByRole('dialog', { name: 'Photo viewer' });
		await expect(dialog).toBeVisible();
		await expect(dialog).toContainText('/ 6');

		await page.getByRole('button', { name: 'Close' }).click();
		await expect(dialog).toBeHidden();
	});

	test('is responsive and captures desktop + mobile screenshots', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/dev/post-preview');
		await page.screenshot({ path: `${OUT}/e2e-preview-desktop.png`, fullPage: true });

		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/dev/post-preview');
		await page.screenshot({ path: `${OUT}/e2e-preview-mobile.png`, fullPage: true });

		// No horizontal overflow on a phone-width viewport.
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBeLessThanOrEqual(1);
	});
});
