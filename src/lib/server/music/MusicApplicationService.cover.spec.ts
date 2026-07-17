import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	AlbumService: { getAlbumById: vi.fn(), updateAlbum: vi.fn() },
	TrackService: { getTrackById: vi.fn(), updateTrack: vi.fn() },
	GenreService: {},
	AlbumTrackService: {}
}));
vi.mock('$lib/db/services/R2Service', () => ({
	deleteFileFromR2: vi.fn(),
	R2_MULTIPART_PART_SIZE: 8 * 1024 * 1024
}));
vi.mock('$lib/server/media', () => ({
	MediaUploadService: {
		createAlbumCoverUpload: vi.fn(),
		createTrackCoverUpload: vi.fn(),
		createTrackAudioUpload: vi.fn(),
		toStoredTarget: vi.fn((t) => ({ stored: t.key }))
	}
}));
vi.mock('$lib/server/events', () => ({ eventPublisher: { publish: vi.fn() } }));

import { AlbumService } from '$lib/db/queries';
import { deleteFileFromR2 } from '$lib/db/services/R2Service';
import { MediaUploadService } from '$lib/server/media';
import { MusicApplicationService, MusicAccessError } from './MusicApplicationService';

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

describe('createAlbumCover', () => {
	it('validates, deletes old cover, issues a target and stores the key', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue(
			album({ coverImageUrl: 'a1/albums/al1/cover.jpg' })
		);
		(MediaUploadService.createAlbumCoverUpload as any).mockResolvedValue({
			key: 'a1/albums/al1/cover.png',
			bucket: 'images',
			target: { mode: 'single' }
		});
		(AlbumService.updateAlbum as any).mockResolvedValue(
			album({ coverImageUrl: 'a1/albums/al1/cover.png' })
		);

		const res = await MusicApplicationService.createAlbumCover('a1', 'al1', {
			fileName: 'c.png',
			contentType: 'image/png',
			size: 2048
		});
		expect(deleteFileFromR2).toHaveBeenCalledWith({
			uniqueKey: 'a1/albums/al1/cover.jpg',
			bucket: 'images'
		});
		expect(AlbumService.updateAlbum).toHaveBeenCalledWith('al1', {
			coverImageUrl: 'a1/albums/al1/cover.png'
		});
		expect(res.uploadTarget.key).toBe('a1/albums/al1/cover.png');
		expect(res.album.coverImageKey).toBe('a1/albums/al1/cover.png');
	});

	it('rejects a non-image before issuing a target', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue(album());
		await expect(
			MusicApplicationService.createAlbumCover('a1', 'al1', {
				fileName: 'c.gif',
				contentType: 'image/gif',
				size: 2048
			})
		).rejects.toThrow();
		expect(MediaUploadService.createAlbumCoverUpload).not.toHaveBeenCalled();
	});

	it('throws when the album is not owned', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue(album({ artistId: 'other' }));
		await expect(
			MusicApplicationService.createAlbumCover('a1', 'al1', {
				fileName: 'c.png',
				contentType: 'image/png',
				size: 2048
			})
		).rejects.toBeInstanceOf(MusicAccessError);
	});
});
