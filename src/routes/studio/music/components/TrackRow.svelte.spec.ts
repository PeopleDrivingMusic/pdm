import { page } from '@vitest/browser/context';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TrackRow from './TrackRow.svelte';

const track = {
	id: 't1',
	artistId: 'a1',
	albumId: null,
	title: 'Song',
	duration: 120,
	audioKey: 'k',
	imageKey: null,
	genres: [],
	status: 'uploaded',
	visibility: 'public',
	isPublished: true,
	trackNumber: null,
	createdAt: '',
	updatedAt: ''
} as any;

const cb = {
	onEdit: vi.fn(),
	onDelete: vi.fn(),
	onLink: vi.fn(),
	onVisibilityChange: vi.fn(),
	onRetry: vi.fn()
};

test('shows a progressbar while a job is uploading', async () => {
	const job = {
		trackId: 't1',
		title: 'Song',
		state: 'uploading',
		progress: 40,
		error: '',
		attempt: 1,
		coverPreviewUrl: null
	} as any;
	render(TrackRow, { track, job, ...cb });
	await expect.element(page.getByRole('progressbar')).toBeInTheDocument();
});
