import { page } from '@vitest/browser/context';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AlbumCard from './AlbumCard.svelte';

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

const cb = { onEdit: vi.fn(), onDelete: vi.fn(), onUnlinkTrack: vi.fn() };

test('shows the gate badge only for subscribers-only albums', async () => {
	render(AlbumCard, { album: album('subscribers_only'), linkedTracks: [], ...cb });
	await expect.element(page.getByText('Subscribers', { exact: true })).toBeInTheDocument();
});
