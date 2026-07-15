import { page } from '@vitest/browser/context';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import UploadDropzone from './UploadDropzone.svelte';

test('exposes a labelled dropzone button', async () => {
	render(UploadDropzone, { onFiles: vi.fn() });
	await expect.element(page.getByRole('button')).toBeInTheDocument();
});

test('emits accepted audio files on input change', async () => {
	const onFiles = vi.fn();
	render(UploadDropzone, { accept: 'audio/*', onFiles });
	const input = document.querySelector('input[type=file]') as HTMLInputElement;
	const file = new File(['x'], 'song.mp3', { type: 'audio/mpeg' });
	Object.defineProperty(input, 'files', { value: [file] });
	input.dispatchEvent(new Event('change', { bubbles: true }));
	expect(onFiles).toHaveBeenCalledWith([file]);
});

test('rejects a non-matching file type', async () => {
	const onFiles = vi.fn();
	render(UploadDropzone, { accept: 'audio/*', onFiles });
	const input = document.querySelector('input[type=file]') as HTMLInputElement;
	const file = new File(['x'], 'note.txt', { type: 'text/plain' });
	Object.defineProperty(input, 'files', { value: [file] });
	input.dispatchEvent(new Event('change', { bubbles: true }));
	expect(onFiles).not.toHaveBeenCalled();
});
