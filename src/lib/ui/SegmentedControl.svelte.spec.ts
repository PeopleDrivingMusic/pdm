import { page } from '@vitest/browser/context';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SegmentedControl from './SegmentedControl.svelte';

const options = [
	{ value: 'public', label: 'Public' },
	{ value: 'subscribers_only', label: 'Subscribers' }
];

test('marks the selected option aria-checked', async () => {
	render(SegmentedControl, { value: 'public', options, ariaLabel: 'Visibility' });
	await expect
		.element(page.getByRole('radio', { name: 'Public' }))
		.toHaveAttribute('aria-checked', 'true');
});

test('fires onChange when another option is clicked', async () => {
	const onChange = vi.fn();
	render(SegmentedControl, { value: 'public', options, ariaLabel: 'Visibility', onChange });
	await page.getByRole('radio', { name: 'Subscribers' }).click();
	expect(onChange).toHaveBeenCalledWith('subscribers_only');
});
