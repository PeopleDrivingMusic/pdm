import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	TrackService: { getTrackById: vi.fn(), updateTrack: vi.fn() },
	AlbumService: {},
	GenreService: {},
	AlbumTrackService: {}
}));
vi.mock('$lib/db/services/R2Service', () => ({
	deleteFileFromR2: vi.fn(),
	R2_MULTIPART_PART_SIZE: 8 * 1024 * 1024
}));
vi.mock('$lib/server/media', () => ({
	MediaUploadService: {
		createTrackCoverUpload: vi.fn(async () => ({
			key: 'a1/tracks/t1/cover.jpg',
			target: { mode: 'single' }
		})),
		createTrackAudioUpload: vi.fn(async () => ({
			key: 'a1/tracks/t1/source.mp3',
			target: { mode: 'single' }
		})),
		toStoredTarget: vi.fn((t) => ({ key: t.key, mode: 'single' }))
	}
}));
vi.mock('$lib/server/events', () => ({ eventPublisher: { publish: vi.fn() } }));

import { TrackService } from '$lib/db/queries';
import { MediaUploadService } from '$lib/server/media';
import { MusicApplicationService } from './MusicApplicationService';

const d = new Date('2026-06-30T00:00:00Z');
const track = (over = {}) => ({
	id: 't1',
	albumId: null,
	artistId: 'a1',
	title: 'S',
	duration: 100,
	audioUrl: 'k',
	lyrics: null,
	clipUrl: null,
	imageUrl: null,
	trackNumber: null,
	genre: [],
	status: 'uploaded',
	isPublished: true,
	visibility: 'public',
	contentId: null,
	metadata: null,
	createdAt: d,
	updatedAt: d,
	...over
});

beforeEach(() => vi.clearAllMocks());

describe('replaceTrackImage', () => {
	it('stores the new image key and returns the target', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		(TrackService.updateTrack as any).mockResolvedValue(
			track({ imageUrl: 'a1/tracks/t1/cover.jpg' })
		);
		const res = await MusicApplicationService.replaceTrackImage('a1', 't1', {
			fileName: 'c.jpg',
			contentType: 'image/jpeg',
			size: 1024
		});
		expect(TrackService.updateTrack).toHaveBeenCalledWith('t1', {
			imageUrl: 'a1/tracks/t1/cover.jpg'
		});
		expect(res.uploadTarget.key).toBe('a1/tracks/t1/cover.jpg');
	});
	it('rejects an invalid image', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		await expect(
			MusicApplicationService.replaceTrackImage('a1', 't1', {
				fileName: 'c.gif',
				contentType: 'image/gif',
				size: 1024
			})
		).rejects.toThrow();
		expect(MediaUploadService.createTrackCoverUpload).not.toHaveBeenCalled();
	});
});

describe('replaceTrackAudio', () => {
	it('sets pending_upload + metadata and returns audio target', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		(TrackService.updateTrack as any).mockResolvedValue(track({ status: 'pending_upload' }));
		const res = await MusicApplicationService.replaceTrackAudio('a1', 't1', {
			fileName: 's.mp3',
			contentType: 'audio/mpeg',
			size: 1024
		});
		expect(TrackService.updateTrack).toHaveBeenCalledWith(
			't1',
			expect.objectContaining({ status: 'pending_upload', audioUrl: 'a1/tracks/t1/source.mp3' })
		);
		expect(res.uploadTargets.audio).toBeDefined();
	});
	it('rejects invalid audio', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		await expect(
			MusicApplicationService.replaceTrackAudio('a1', 't1', {
				fileName: 's.txt',
				contentType: 'text/plain',
				size: 1024
			})
		).rejects.toThrow();
	});
});
