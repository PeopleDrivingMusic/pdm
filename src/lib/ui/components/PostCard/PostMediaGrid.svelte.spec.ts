import { tick } from 'svelte';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PostMediaGrid from './PostMediaGrid.svelte';

type Media = {
	id: string;
	fileUrl: string;
	thumbnailUrl: string | null;
	alt: string | null;
	caption: string | null;
};

const photo = (i: number, over: Partial<Media> = {}): Media => ({
	id: `p${i}`,
	fileUrl: `https://cdn.example/${i}.jpg`,
	thumbnailUrl: null,
	alt: `Photo ${i}`,
	caption: null,
	...over
});

const photos = (n: number) => Array.from({ length: n }, (_, i) => photo(i + 1));

test('renders every photo (no cap)', () => {
	const { container } = render(PostMediaGrid, { media: photos(6) });
	expect(container.querySelectorAll('img')).toHaveLength(6);
});

test('renders a single photo', () => {
	const { container } = render(PostMediaGrid, { media: photos(1) });
	expect(container.querySelectorAll('img')).toHaveLength(1);
	expect(container.querySelector('.post-media--single')).not.toBeNull();
});

test('renders nothing when there are no photos', () => {
	const { container } = render(PostMediaGrid, { media: [] });
	expect(container.querySelectorAll('img')).toHaveLength(0);
});

test('uses the photo alt text on each image', () => {
	const { container } = render(PostMediaGrid, { media: [photo(1, { alt: 'Backstage' })] });
	expect(container.querySelector('img')?.getAttribute('alt')).toBe('Backstage');
});

test('prefers the thumbnail url over the full file url', () => {
	const { container } = render(PostMediaGrid, {
		media: [photo(1, { thumbnailUrl: 'https://cdn.example/thumb.jpg' })]
	});
	expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example/thumb.jpg');
});

test('opens the lightbox when a photo tile is clicked', async () => {
	// The lightbox portals to <body>, so assert against the document.
	const { container } = render(PostMediaGrid, { media: photos(3) });
	expect(document.querySelector('[role="dialog"]')).toBeNull();
	(container.querySelector('.tile') as HTMLButtonElement).click();
	await tick();
	expect(document.querySelector('[role="dialog"]')).not.toBeNull();
});

test('opens the lightbox from the last tile', async () => {
	const { container } = render(PostMediaGrid, { media: photos(6) });
	const tiles = container.querySelectorAll('.tile');
	(tiles[tiles.length - 1] as HTMLButtonElement).click();
	await tick();
	expect(document.querySelector('[role="dialog"]')).not.toBeNull();
});
