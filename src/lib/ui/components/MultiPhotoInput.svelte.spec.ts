import { tick } from 'svelte';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MultiPhotoInput from './MultiPhotoInput.svelte';

const imageFile = (name: string, bytes = 4) =>
	new File([new Uint8Array(bytes)], name, { type: 'image/png' });

function selectFiles(container: Element, files: File[]) {
	const input = container.querySelector('input[type="file"]') as HTMLInputElement;
	const dt = new DataTransfer();
	files.forEach((f) => dt.items.add(f));
	input.files = dt.files;
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

const uploaded = (key: string) => ({ key, contentType: 'image/png', size: 4 });

test('has a multiple file input', () => {
	const { container } = render(MultiPhotoInput, { onUpload: vi.fn() });
	const input = container.querySelector('input[type="file"]') as HTMLInputElement;
	expect(input.multiple).toBe(true);
});

test('uploads each selected file and renders a thumbnail', async () => {
	const onUpload = vi.fn().mockResolvedValue(uploaded('k1'));
	const { container } = render(MultiPhotoInput, { onUpload });

	selectFiles(container, [imageFile('a.png')]);
	await vi.waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
	expect(container.querySelectorAll('.thumb')).toHaveLength(1);
});

test('emits the uploaded photos through onChange', async () => {
	const onUpload = vi.fn().mockResolvedValue(uploaded('k1'));
	const onChange = vi.fn();
	const { container } = render(MultiPhotoInput, { onUpload, onChange });

	selectFiles(container, [imageFile('a.png')]);
	await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith([uploaded('k1')]));
});

test('removing an uploaded photo cleans it up and updates onChange', async () => {
	const onUpload = vi.fn().mockResolvedValue(uploaded('k1'));
	const onRemovePhoto = vi.fn();
	const onChange = vi.fn();
	const { container } = render(MultiPhotoInput, { onUpload, onRemovePhoto, onChange });

	selectFiles(container, [imageFile('a.png')]);
	await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith([uploaded('k1')]));

	(container.querySelector('.thumb__remove') as HTMLButtonElement).click();
	await tick();

	expect(onRemovePhoto).toHaveBeenCalledWith(uploaded('k1'));
	expect(container.querySelectorAll('.thumb')).toHaveLength(0);
	expect(onChange).toHaveBeenLastCalledWith([]);
});

test('marks a failed upload as an error and keeps it out of onChange', async () => {
	const onUpload = vi.fn().mockRejectedValue(new Error('network'));
	const onChange = vi.fn();
	const { container } = render(MultiPhotoInput, { onUpload, onChange });

	selectFiles(container, [imageFile('a.png')]);
	await vi.waitFor(() => expect(container.querySelector('.thumb--error')).not.toBeNull());
	expect(onChange).not.toHaveBeenCalled();
});

test('rejects files over the size limit without uploading', async () => {
	const onUpload = vi.fn();
	const { container } = render(MultiPhotoInput, { onUpload, maxSizeMb: 0 });

	selectFiles(container, [imageFile('big.png', 8)]);
	await tick();
	expect(onUpload).not.toHaveBeenCalled();
	expect(container.querySelector('.multi-photo__error')).not.toBeNull();
});
