import { page } from '@vitest/browser/context';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MessageComposer from './MessageComposer.svelte';

test('submits the trimmed draft and clears the field', async () => {
	const onSubmit = vi.fn().mockResolvedValue(undefined);
	render(MessageComposer, { onSubmit });

	const field = page.getByRole('textbox');
	await field.fill('  first thoughts  ');
	await page.getByRole('button', { name: /send/i }).click();

	expect(onSubmit).toHaveBeenCalledWith('first thoughts');
	await expect.element(field).toHaveValue('');
});

test('cannot submit an empty or whitespace-only draft', async () => {
	const onSubmit = vi.fn();
	render(MessageComposer, { onSubmit });

	await page.getByRole('textbox').fill('   ');
	await expect.element(page.getByRole('button', { name: /send/i })).toBeDisabled();
	expect(onSubmit).not.toHaveBeenCalled();
});

test('respects the disabled prop', async () => {
	const onSubmit = vi.fn();
	render(MessageComposer, { onSubmit, disabled: true });

	await expect.element(page.getByRole('textbox')).toBeDisabled();
	await expect.element(page.getByRole('button', { name: /send/i })).toBeDisabled();
});

test('renders the given placeholder so the composer can be reused', async () => {
	render(MessageComposer, { onSubmit: vi.fn(), placeholder: 'Message the fan chat…' });
	await expect.element(page.getByPlaceholder('Message the fan chat…')).toBeInTheDocument();
});

test('uses a custom submit label when provided', async () => {
	render(MessageComposer, { onSubmit: vi.fn(), submitLabel: 'Post' });
	await expect.element(page.getByRole('button', { name: 'Post' })).toBeInTheDocument();
});

test('offers an emoji toggle', async () => {
	render(MessageComposer, { onSubmit: vi.fn() });
	await expect.element(page.getByRole('button', { name: /emoji/i })).toBeInTheDocument();
});
