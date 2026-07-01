import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	TrackService: { getTrackById: vi.fn(), updateTrack: vi.fn(), deleteTrack: vi.fn() },
	AlbumService: { getAlbumById: vi.fn() },
	AlbumTrackService: { linkTrackToAlbum: vi.fn(), unlinkTrackFromAlbum: vi.fn() },
	GenreService: { getOrCreateGenres: vi.fn() }
}));
vi.mock('$lib/server/events', () => ({ eventPublisher: { publish: vi.fn() } }));

import { TrackService, AlbumService, AlbumTrackService } from '$lib/db/queries';
import { eventPublisher } from '$lib/server/events';
import { MusicApplicationService } from './MusicApplicationService';

const d = new Date('2026-06-30T00:00:00Z');
const track = (over = {}) => ({
	id: 't1',
	albumId: null,
	artistId: 'a1',
	title: 'S',
	duration: 100,
	audioUrl: null,
	lyrics: null,
	clipUrl: null,
	imageUrl: null,
	trackNumber: null,
	genre: [],
	status: 'uploaded',
	isPublished: false,
	visibility: 'public',
	contentId: null,
	metadata: null,
	createdAt: d,
	updatedAt: d,
	...over
});
const album = (over = {}) => ({
	...track(),
	id: 'al1',
	coverImageUrl: null,
	releaseDate: null,
	price: null,
	genres: [],
	description: null,
	...over
});

beforeEach(() => vi.clearAllMocks());

describe('linkTrackToAlbum inheritance', () => {
	it('overwrites track visibility with the album visibility and emits', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue(album({ visibility: 'subscribers_only' }));
		(TrackService.getTrackById as any).mockResolvedValue(track({ visibility: 'public' }));
		(AlbumTrackService.linkTrackToAlbum as any).mockResolvedValue({
			albumId: 'al1',
			trackId: 't1',
			trackNumber: 1
		});
		(TrackService.updateTrack as any).mockResolvedValue(track({ visibility: 'subscribers_only' }));

		const res = await MusicApplicationService.linkTrackToAlbum('a1', 'al1', 't1', 1);
		expect(TrackService.updateTrack).toHaveBeenCalledWith('t1', {
			visibility: 'subscribers_only'
		});
		expect(eventPublisher.publish).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'track.visibility_changed', visibility: 'subscribers_only' })
		);
		expect(res).toEqual({ albumId: 'al1', trackId: 't1', trackNumber: 1 });
	});
	it('does not emit when album visibility matches the track', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue(album({ visibility: 'public' }));
		(TrackService.getTrackById as any).mockResolvedValue(track({ visibility: 'public' }));
		(AlbumTrackService.linkTrackToAlbum as any).mockResolvedValue({
			albumId: 'al1',
			trackId: 't1',
			trackNumber: 1
		});
		await MusicApplicationService.linkTrackToAlbum('a1', 'al1', 't1', 1);
		expect(eventPublisher.publish).not.toHaveBeenCalled();
	});
});

describe('updateTrackMetadata', () => {
	it('emits track.visibility_changed and track.published when both change', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(
			track({ visibility: 'public', isPublished: false })
		);
		(TrackService.updateTrack as any).mockResolvedValue(
			track({ visibility: 'subscribers_only', isPublished: true })
		);
		await MusicApplicationService.updateTrackMetadata('a1', 't1', {
			visibility: 'subscribers_only',
			isPublished: true
		});
		expect(eventPublisher.publish).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'track.visibility_changed' })
		);
		expect(eventPublisher.publish).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'track.published' })
		);
	});
});

describe('deleteTrack', () => {
	it('deletes and emits track.deleted', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		(TrackService.deleteTrack as any).mockResolvedValue(true);
		const res = await MusicApplicationService.deleteTrack('a1', 't1');
		expect(res).toEqual({ ok: true });
		expect(eventPublisher.publish).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'track.deleted' })
		);
	});
});
