import { page } from '@vitest/browser/context';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Badge from './Badge.svelte';

test('renders label text', async () => {
	render(Badge, { variant: 'published', label: 'Published' });
	await expect.element(page.getByText('Published')).toBeInTheDocument();
});

test('gate variant shows its label', async () => {
	render(Badge, { variant: 'gate', label: 'Subscribers' });
	await expect.element(page.getByText('Subscribers')).toBeInTheDocument();
});
