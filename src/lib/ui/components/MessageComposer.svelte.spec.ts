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

test('keeps the draft when the submit is refused, so it can be fixed and resent', async () => {
	// A refusal (link policy, rate limit, network blip) must not destroy typed text.
	const onSubmit = vi.fn().mockResolvedValue(false);
	render(MessageComposer, { onSubmit });

	const field = page.getByRole('textbox');
	await field.fill('check scam.com out');
	await page.getByRole('button', { name: /send/i }).click();

	expect(onSubmit).toHaveBeenCalledWith('check scam.com out');
	await expect.element(field).toHaveValue('check scam.com out');
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

test('starts as a single line and grows as the draft wraps', async () => {
	render(MessageComposer, { onSubmit: vi.fn() });
	const field = page.getByRole('textbox');

	const element = field.element() as HTMLTextAreaElement;
	expect(element.rows).toBe(1);
	const initialHeight = element.clientHeight;

	await field.fill('a long draft\nspanning\nseveral\nlines');
	expect(element.clientHeight).toBeGreaterThan(initialHeight);
});

test('shrinks back after the draft is submitted', async () => {
	const onSubmit = vi.fn().mockResolvedValue(undefined);
	render(MessageComposer, { onSubmit });
	const field = page.getByRole('textbox');
	const element = field.element() as HTMLTextAreaElement;

	const initialHeight = element.clientHeight;
	await field.fill('one\ntwo\nthree\nfour');
	expect(element.clientHeight).toBeGreaterThan(initialHeight);

	await page.getByRole('button', { name: /send/i }).click();
	await expect.element(field).toHaveValue('');
	expect(element.clientHeight).toBe(initialHeight);
});

test('offers an emoji toggle', async () => {
	render(MessageComposer, { onSubmit: vi.fn() });
	await expect.element(page.getByRole('button', { name: /emoji/i })).toBeInTheDocument();
});
