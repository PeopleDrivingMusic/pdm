import { page } from '@vitest/browser/context';
import { expect, test, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { mdiPencilOutline, mdiTrashCanOutline } from '@mdi/js';
import Menu from './Menu.svelte';

// The dropdown right-aligns to its trigger and opens leftward (min-width 170px).
// Mounted alone near the test viewport's left edge, that would push it to negative
// x — invisible to real pointer clicks even though it's still in the DOM. Padding
// gives it room, matching how it always has some in real layouts (a message row,
// a card footer).
beforeEach(() => {
	document.documentElement.style.paddingLeft = '220px';
});
afterEach(() => {
	document.documentElement.style.paddingLeft = '';
});

const items = [
	{ key: 'edit', label: 'Edit comment', icon: mdiPencilOutline },
	{ key: 'delete', label: 'Delete comment', icon: mdiTrashCanOutline, danger: true }
];

test('starts closed, with the items hidden', async () => {
	render(Menu, { label: 'More actions', items, onSelect: vi.fn() });

	await expect.element(page.getByRole('button', { name: 'More actions' })).toBeInTheDocument();
	await expect.element(page.getByRole('button', { name: 'Edit comment' })).not.toBeInTheDocument();
});

test('opens on trigger click and shows every item', async () => {
	render(Menu, { label: 'More actions', items, onSelect: vi.fn() });

	const trigger = page.getByRole('button', { name: 'More actions' });
	await trigger.click();

	await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
	await expect.element(page.getByRole('button', { name: 'Edit comment' })).toBeInTheDocument();
	await expect.element(page.getByRole('button', { name: 'Delete comment' })).toBeInTheDocument();
});

test('selecting an item calls onSelect with its key and closes the menu', async () => {
	const onSelect = vi.fn();
	render(Menu, { label: 'More actions', items, onSelect });

	await page.getByRole('button', { name: 'More actions' }).click();
	await page.getByRole('button', { name: 'Delete comment' }).click();

	expect(onSelect).toHaveBeenCalledWith('delete');
	await expect
		.element(page.getByRole('button', { name: 'Delete comment' }))
		.not.toBeInTheDocument();
});

test('marks a danger item so it can be styled apart from the rest', async () => {
	const { container } = render(Menu, { label: 'More actions', items, onSelect: vi.fn() });

	await page.getByRole('button', { name: 'More actions' }).click();

	const danger = container.querySelector('.danger');
	expect(danger?.textContent).toContain('Delete comment');
});

test('closes on an outside click', async () => {
	render(Menu, { label: 'More actions', items, onSelect: vi.fn() });

	await page.getByRole('button', { name: 'More actions' }).click();
	await expect.element(page.getByRole('button', { name: 'Edit comment' })).toBeInTheDocument();

	document.body.click();
	await expect.element(page.getByRole('button', { name: 'Edit comment' })).not.toBeInTheDocument();
});

test('closes on Escape and returns focus to the trigger', async () => {
	render(Menu, { label: 'More actions', items, onSelect: vi.fn() });

	const trigger = page.getByRole('button', { name: 'More actions' });
	await trigger.click();
	const editButton = page.getByRole('button', { name: 'Edit comment' }).element() as HTMLElement;
	editButton.focus();
	editButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

	await expect.element(page.getByRole('button', { name: 'Edit comment' })).not.toBeInTheDocument();
	await expect.element(trigger).toHaveFocus();
});
