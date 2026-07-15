import { page } from '@vitest/browser/context';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import VisibilityToggle from './VisibilityToggle.svelte';

test('defaults to public and marks it selected', async () => {
	render(VisibilityToggle, { value: 'public', level: 'track' });
	await expect
		.element(page.getByRole('radio', { name: /Public/ }))
		.toHaveAttribute('aria-checked', 'true');
});

test('fires onChange when subscribers_only is selected', async () => {
	const onChange = vi.fn();
	render(VisibilityToggle, { value: 'public', level: 'track', onChange });
	await page.getByRole('radio', { name: /Subscribers/ }).click();
	expect(onChange).toHaveBeenCalledWith('subscribers_only');
});

test('shows an inherited cue for an inherited track', async () => {
	render(VisibilityToggle, { value: 'subscribers_only', level: 'track', inheritedFrom: 'album' });
	await expect.element(page.getByText(/from album/i)).toBeInTheDocument();
});
