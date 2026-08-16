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

test('opening a second menu closes the first, without needing an outside click first', async () => {
	// Each gets its own host, spaced apart, so B's dropdown doesn't render
	// underneath A's and steal the click meant for B's trigger.
	const hostA = document.body.appendChild(document.createElement('div'));
	hostA.style.cssText = 'position: fixed; top: 20px; left: 220px;';
	const hostB = document.body.appendChild(document.createElement('div'));
	hostB.style.cssText = 'position: fixed; top: 300px; left: 220px;';

	render(Menu, { target: hostA, props: { label: 'More actions A', items, onSelect: vi.fn() } });
	render(Menu, { target: hostB, props: { label: 'More actions B', items, onSelect: vi.fn() } });

	const triggerA = page.getByRole('button', { name: 'More actions A' });
	const triggerB = page.getByRole('button', { name: 'More actions B' });

	await triggerA.click();
	await expect.element(triggerA).toHaveAttribute('aria-expanded', 'true');

	// B's trigger sits outside A's own wrapper, so opening B must close A —
	// same as any other outside click, not just an accident of DOM order.
	await triggerB.click();

	await expect.element(triggerA).toHaveAttribute('aria-expanded', 'false');
	await expect.element(triggerB).toHaveAttribute('aria-expanded', 'true');
	expect(document.querySelectorAll('.menu')).toHaveLength(1);
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
