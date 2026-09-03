import { page } from '@vitest/browser/context';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Textarea from './Textarea.svelte';

test('renders the label and binds the id to it', () => {
	const { container } = render(Textarea, { label: 'Message' });
	const label = container.querySelector('label');
	const textarea = container.querySelector('textarea');
	expect(label?.getAttribute('for')).toBe(textarea?.id);
});

test('renders no label element when none is given', () => {
	const { container } = render(Textarea, {});
	expect(container.querySelector('label')).toBeNull();
});

test('shows the required indicator only when required', () => {
	const { container } = render(Textarea, { label: 'Message', required: true });
	expect(container.querySelector('.required-indicator')).not.toBeNull();
});

test('lets the viewer type into it', async () => {
	render(Textarea, { label: 'Message' });
	const textarea = page.getByLabelText('Message');
	await textarea.fill('hello there');
	await expect.element(textarea).toHaveValue('hello there');
});

test('applies the error class when error is set', () => {
	const { container } = render(Textarea, { error: true });
	expect(container.querySelector('.textarea')).toHaveClass('textarea--error');
});
