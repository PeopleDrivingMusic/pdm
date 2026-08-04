import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	AlbumService: {
		getAlbumById: vi.fn(),
		createAlbum: vi.fn(),
		updateAlbum: vi.fn(),
		deleteAlbum: vi.fn()
	},
	TrackService: { updateTrack: vi.fn(), getTrackById: vi.fn() },
	GenreService: { getOrCreateGenres: vi.fn() },
	AlbumTrackService: { getAlbumTracks: vi.fn() }
}));
vi.mock('$lib/db/services/R2Service', () => ({ deleteFileFromR2: vi.fn() }));
vi.mock('$lib/server/events', () => ({ eventPublisher: { publish: vi.fn() } }));

import { AlbumService, TrackService, GenreService, AlbumTrackService } from '$lib/db/queries';
import { deleteFileFromR2 } from '$lib/db/services/R2Service';
import { eventPublisher } from '$lib/server/events';
import { MusicApplicationService } from './MusicApplicationService';

const d = new Date('2026-06-30T00:00:00Z');
const album = (over = {}) => ({
	id: 'al1',
	artistId: 'a1',
	title: 'A',
	description: null,
	coverImageUrl: null,
	releaseDate: null,
	price: null,
	isPublished: false,
	visibility: 'public',
	genres: [],
	metadata: null,
	createdAt: d,
	updatedAt: d,
	...over
});

beforeEach(() => vi.clearAllMocks());

describe('createAlbum', () => {
	it('creates and returns a DTO', async () => {
		(AlbumService.createAlbum as any).mockResolvedValue(album({ title: 'New' }));
		(GenreService.getOrCreateGenres as any).mockResolvedValue([]);
		const dto = await MusicApplicationService.createAlbum('a1', {
			title: 'New',
			visibility: 'public'
		});
		expect(dto.title).toBe('New');
		expect(AlbumService.createAlbum).toHaveBeenCalledWith(
			expect.objectContaining({ artistId: 'a1', visibility: 'public' })
		);
	});
});

describe('updateAlbum visibility cascade', () => {
	it('cascades visibility to linked tracks and emits events', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue(album({ visibility: 'public' }));
		(AlbumService.updateAlbum as any).mockResolvedValue(album({ visibility: 'subscribers' }));
		(AlbumTrackService.getAlbumTracks as any).mockResolvedValue([
			{ track: { id: 't1' }, trackNumber: 1 },
			{ track: { id: 't2' }, trackNumber: 2 }
		]);
		(TrackService.updateTrack as any).mockResolvedValue(null);

		await MusicApplicationService.updateAlbum('a1', 'al1', { visibility: 'subscribers' });

		expect(TrackService.updateTrack).toHaveBeenCalledWith('t1', {
			visibility: 'subscribers'
		});
		expect(TrackService.updateTrack).toHaveBeenCalledWith('t2', {
			visibility: 'subscribers'
		});
		expect(eventPublisher.publish).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'album.visibility_changed', trackIds: ['t1', 't2'] })
		);
	});
	it('does not cascade when visibility is unchanged', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue(album({ visibility: 'public' }));
		(AlbumService.updateAlbum as any).mockResolvedValue(
			album({ title: 'Renamed', visibility: 'public' })
		);
		await MusicApplicationService.updateAlbum('a1', 'al1', { title: 'Renamed' });
		expect(AlbumTrackService.getAlbumTracks).not.toHaveBeenCalled();
	});
});

describe('deleteAlbum', () => {
	it('deletes the R2 cover when present then the album', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue(
			album({ coverImageUrl: 'a1/albums/al1/cover.jpg' })
		);
		(AlbumService.deleteAlbum as any).mockResolvedValue(true);
		const res = await MusicApplicationService.deleteAlbum('a1', 'al1');
		expect(deleteFileFromR2).toHaveBeenCalledWith({
			uniqueKey: 'a1/albums/al1/cover.jpg',
			bucket: 'images'
		});
		expect(res).toEqual({ ok: true });
	});
});
