import { page } from '@vitest/browser/context';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AlbumTile from './AlbumTile.svelte';

const album = (visibility: 'public' | 'subscribers_only') => ({
	id: 'al1',
	artistId: 'a1',
	title: 'Test Album',
	description: null,
	coverImageKey: null,
	releaseDate: null,
	genres: [],
	visibility,
	isPublished: true,
	createdAt: '',
	updatedAt: ''
});
const cb = { onEdit: vi.fn(), onDelete: vi.fn() };

test('shows the gate badge only for subscribers-only albums', async () => {
	render(AlbumTile, { album: album('subscribers_only'), trackCount: 3, ...cb });
	await expect.element(page.getByText('Subscribers', { exact: true })).toBeInTheDocument();
});

test('renders the album title', async () => {
	render(AlbumTile, { album: album('public'), trackCount: 3, ...cb });
	await expect.element(page.getByText('Test Album')).toBeInTheDocument();
});
