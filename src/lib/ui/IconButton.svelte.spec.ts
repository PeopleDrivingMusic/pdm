import { page } from '@vitest/browser/context';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { mdiHeart } from '@mdi/js';
import IconButton from './IconButton.svelte';

test('fires onClick', async () => {
	const onClick = vi.fn();
	render(IconButton, { path: mdiHeart, label: 'Like', onClick });

	await page.getByRole('button', { name: 'Like' }).click();

	expect(onClick).toHaveBeenCalledOnce();
});

test('renders no count by default', () => {
	const { container } = render(IconButton, { path: mdiHeart, label: 'Like' });
	expect(container.querySelector('.icon-button__count')).toBeNull();
});

test('shows the count when provided and positive', () => {
	const { container } = render(IconButton, { path: mdiHeart, label: 'Like', count: 3 });
	expect(container.querySelector('.icon-button__count')?.textContent).toBe('3');
});

test('hides the count text at zero, but still switches to the wider layout', () => {
	const { container } = render(IconButton, { path: mdiHeart, label: 'Like', count: 0 });
	expect(container.querySelector('.icon-button__count')).toBeNull();
	expect(container.querySelector('.icon-button')).toHaveClass('icon-button--counted');
});

test('applies the accent tone as a color-only class, not the solid active fill', () => {
	const { container } = render(IconButton, { path: mdiHeart, label: 'Like', tone: 'accent' });
	const button = container.querySelector('.icon-button');
	expect(button).toHaveClass('icon-button--accent');
	expect(button).not.toHaveClass('icon-button--active');
});

test('reflects the tone as aria-pressed, but only when tone is set at all', () => {
	const { container: liked } = render(IconButton, {
		path: mdiHeart,
		label: 'Unlike',
		tone: 'accent'
	});
	expect(liked.querySelector('.icon-button')).toHaveAttribute('aria-pressed', 'true');

	const { container: unliked } = render(IconButton, {
		path: mdiHeart,
		label: 'Like',
		tone: 'neutral'
	});
	expect(unliked.querySelector('.icon-button')).toHaveAttribute('aria-pressed', 'false');

	const { container: plain } = render(IconButton, { path: mdiHeart, label: 'Edit' });
	expect(plain.querySelector('.icon-button')).not.toHaveAttribute('aria-pressed');
});

test('active still applies the existing solid-fill toggle state', () => {
	const { container } = render(IconButton, { path: mdiHeart, label: 'Bold', active: true });
	expect(container.querySelector('.icon-button')).toHaveClass('icon-button--active');
});
