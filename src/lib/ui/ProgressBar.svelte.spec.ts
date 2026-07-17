import { page } from '@vitest/browser/context';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ProgressBar from './ProgressBar.svelte';

test('renders a progressbar with aria values', async () => {
	render(ProgressBar, { value: 42, label: 'Uploading Song' });
	const bar = page.getByRole('progressbar');
	await expect.element(bar).toHaveAttribute('aria-valuenow', '42');
	await expect.element(bar).toHaveAttribute('aria-label', 'Uploading Song');
});

test('omits aria-valuenow when indeterminate', async () => {
	render(ProgressBar, { value: 0, label: 'Finalizing', indeterminate: true });
	const bar = page.getByRole('progressbar');
	await expect.element(bar).not.toHaveAttribute('aria-valuenow');
});
