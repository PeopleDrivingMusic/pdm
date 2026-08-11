import { page } from '@vitest/browser/context';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MessageList from './MessageList.svelte';

const comment = (over: Record<string, unknown> = {}) => ({
	id: 'm1',
	body: 'This track slaps',
	createdAt: '2026-08-04T00:00:00.000Z',
	editedAt: null as string | null,
	author: { id: 'u2', name: 'Real Fan', avatar: null as string | null },
	isArtist: false,
	canDelete: false,
	canEdit: false,
	...over
});

test('renders each comment with its author', async () => {
	render(MessageList, {
		messages: [
			comment(),
			comment({ id: 'm2', body: 'agreed', author: { id: 'u3', name: 'Other', avatar: null } })
		]
	});

	await expect.element(page.getByText('This track slaps')).toBeInTheDocument();
	await expect.element(page.getByText('Real Fan')).toBeInTheDocument();
	await expect.element(page.getByText('agreed')).toBeInTheDocument();
});

test('marks the artist author with a badge', async () => {
	render(MessageList, {
		messages: [comment({ isArtist: true, author: { id: 'a1', name: 'Nyx', avatar: null } })]
	});
	await expect.element(page.getByText('Artist')).toBeInTheDocument();
});

test('does not badge a regular listener', async () => {
	render(MessageList, { messages: [comment()] });
	await expect.element(page.getByText('Artist')).not.toBeInTheDocument();
});

test('shows an edited marker only when the comment was edited', async () => {
	render(MessageList, { messages: [comment({ editedAt: '2026-08-05T00:00:00.000Z' })] });
	await expect.element(page.getByText('(edited)')).toBeInTheDocument();
});

test('hides the edited marker for an untouched comment', async () => {
	render(MessageList, { messages: [comment()] });
	await expect.element(page.getByText('(edited)')).not.toBeInTheDocument();
});

test('renders a body containing markup as plain text', async () => {
	render(MessageList, { messages: [comment({ body: '<img src=x onerror=alert(1)>' })] });
	await expect.element(page.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
});

test('keeps row actions behind a single overflow menu', async () => {
	render(MessageList, { messages: [comment({ canEdit: true, canDelete: true })] });

	// Collapsed by default — one compact trigger instead of a row of icons.
	await expect.element(page.getByRole('button', { name: /more actions/i })).toBeInTheDocument();
	await expect
		.element(page.getByRole('button', { name: /delete comment/i }))
		.not.toBeInTheDocument();

	await page.getByRole('button', { name: /more actions/i }).click();
	await expect.element(page.getByRole('button', { name: /delete comment/i })).toBeInTheDocument();
});

test('offers delete only when the viewer may delete', async () => {
	const onDelete = vi.fn();
	render(MessageList, { messages: [comment({ canDelete: true })], onDelete });

	await page.getByRole('button', { name: /more actions/i }).click();
	await page.getByRole('button', { name: /delete comment/i }).click();
	expect(onDelete).toHaveBeenCalledWith('m1');
});

test('hides the overflow menu entirely when the viewer can do nothing', async () => {
	render(MessageList, { messages: [comment()] });
	await expect.element(page.getByRole('button', { name: /more actions/i })).not.toBeInTheDocument();
});

test('lets the author edit inline and saves the new body', async () => {
	const onEdit = vi.fn().mockResolvedValue(undefined);
	render(MessageList, { messages: [comment({ canEdit: true })], onEdit });

	await page.getByRole('button', { name: /more actions/i }).click();
	await page.getByRole('button', { name: /edit comment/i }).click();
	const field = page.getByRole('textbox', { name: /edit comment/i });
	await field.fill('reworded');
	await page.getByRole('button', { name: /save/i }).click();

	expect(onEdit).toHaveBeenCalledWith('m1', 'reworded');
});

test('hides edit when the viewer is not the author', async () => {
	render(MessageList, { messages: [comment({ canDelete: true })] });

	await page.getByRole('button', { name: /more actions/i }).click();
	await expect.element(page.getByRole('button', { name: /edit comment/i })).not.toBeInTheDocument();
});
