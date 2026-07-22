import { tick } from 'svelte';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PhotoLightbox from './PhotoLightbox.svelte';

// The lightbox portals itself to <body>, so query the document, not the container.
const dialog = () => document.querySelector('[role="dialog"]');
const clickButton = (label: string) =>
	(document.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement).click();

type Photo = {
	id: string;
	fileUrl: string;
	thumbnailUrl: string | null;
	alt: string | null;
	caption: string | null;
};

const photo = (i: number): Photo => ({
	id: `p${i}`,
	fileUrl: `https://cdn.example/full-${i}.jpg`,
	thumbnailUrl: `https://cdn.example/thumb-${i}.jpg`,
	alt: `Photo ${i}`,
	caption: null
});

const photos = (n: number) => Array.from({ length: n }, (_, i) => photo(i + 1));

test('renders nothing while closed', () => {
	render(PhotoLightbox, { photos: photos(3), open: false, index: 0 });
	expect(dialog()).toBeNull();
});

test('shows the full-size current photo and a counter when open', () => {
	render(PhotoLightbox, { photos: photos(3), open: true, index: 0 });
	expect(dialog()).not.toBeNull();
	const img = document.querySelector('.lightbox-photo') as HTMLImageElement | null;
	expect(img?.getAttribute('src')).toBe('https://cdn.example/full-1.jpg');
	expect(dialog()?.textContent).toContain('1 / 3');
});

test('advances to the next photo', async () => {
	render(PhotoLightbox, { photos: photos(3), open: true, index: 0 });
	clickButton('Next photo');
	await tick();
	expect(dialog()?.textContent).toContain('2 / 3');
	expect((document.querySelector('.lightbox-photo') as HTMLImageElement).src).toContain('full-2');
});

test('goes back to the previous photo', async () => {
	render(PhotoLightbox, { photos: photos(3), open: true, index: 2 });
	clickButton('Previous photo');
	await tick();
	expect(dialog()?.textContent).toContain('2 / 3');
});

test('disables previous on the first photo and next on the last', () => {
	render(PhotoLightbox, { photos: photos(2), open: true, index: 0 });
	const prev = document.querySelector('[aria-label="Previous photo"]') as HTMLButtonElement;
	expect(prev.disabled).toBe(true);
});

test('calls onClose when the close button is clicked', () => {
	const onClose = vi.fn();
	render(PhotoLightbox, { photos: photos(3), open: true, index: 0, onClose });
	clickButton('Close');
	expect(onClose).toHaveBeenCalledOnce();
});

test('uses the photo alt text on the current image', () => {
	render(PhotoLightbox, { photos: photos(3), open: true, index: 1 });
	expect(document.querySelector('.lightbox-photo')?.getAttribute('alt')).toBe('Photo 2');
});
