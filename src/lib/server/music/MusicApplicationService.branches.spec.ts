import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	TrackService: {
		createTrack: vi.fn(),
		updateTrack: vi.fn(),
		getTrackById: vi.fn(),
		deleteTrack: vi.fn()
	},
	AlbumService: { getAlbumById: vi.fn(), createAlbum: vi.fn(), updateAlbum: vi.fn() },
	AlbumTrackService: { unlinkTrackFromAlbum: vi.fn() },
	GenreService: { getOrCreateGenres: vi.fn() }
}));
vi.mock('$lib/db/services/R2Service', () => ({
	deleteFileFromR2: vi.fn(),
	R2_MULTIPART_PART_SIZE: 8 * 1024 * 1024
}));
vi.mock('$lib/server/media', () => ({
	MediaUploadService: {
		createTrackAudioUpload: vi.fn(async () => ({ key: 'a1/tracks/t1/source.mp3', target: {} })),
		createTrackCoverUpload: vi.fn(async () => ({ key: 'a1/tracks/t1/cover.jpg', target: {} })),
		toStoredTarget: vi.fn((t) => ({ key: t.key, mode: 'single' })),
		renewStoredTarget: vi.fn(async (t) => ({ renewed: t.key })),
		completeMultipart: vi.fn(),
		verifyObject: vi.fn()
	}
}));
vi.mock('$lib/server/events', () => ({ eventPublisher: { publish: vi.fn() } }));

import { TrackService, AlbumService, GenreService, AlbumTrackService } from '$lib/db/queries';
import { MediaUploadService } from '$lib/server/media';
import { eventPublisher } from '$lib/server/events';
import { MusicApplicationService, MusicAccessError } from './MusicApplicationService';

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
	status: 'pending_upload',
	isPublished: false,
	visibility: 'public',
	contentId: null,
	metadata: {
		upload: {
			uploads: {
				audio: { key: 'a1/tracks/t1/source.mp3', mode: 'single' },
				cover: { key: 'a1/tracks/t1/cover.jpg', mode: 'single' }
			}
		}
	},
	createdAt: d,
	updatedAt: d,
	...over
});

beforeEach(() => vi.clearAllMocks());

describe('createTrack with cover', () => {
	it('issues a cover target and stores cover metadata', async () => {
		(TrackService.createTrack as any).mockResolvedValue(track());
		(TrackService.updateTrack as any).mockResolvedValue(track());
		(GenreService.getOrCreateGenres as any).mockResolvedValue([]);
		const res = await MusicApplicationService.createTrack('a1', {
			title: 'S',
			genres: ['rock'],
			audio: { fileName: 'x.mp3', contentType: 'audio/mpeg', size: 1024 },
			cover: { fileName: 'c.jpg', contentType: 'image/jpeg', size: 512 }
		});
		expect(MediaUploadService.createTrackCoverUpload).toHaveBeenCalled();
		expect(res.uploadTargets.cover).not.toBeNull();
		expect(GenreService.getOrCreateGenres).toHaveBeenCalledWith(['rock']);
	});
	it('rejects an invalid cover before creating', async () => {
		await expect(
			MusicApplicationService.createTrack('a1', {
				title: 'S',
				audio: { fileName: 'x.mp3', contentType: 'audio/mpeg', size: 1024 },
				cover: { fileName: 'c.gif', contentType: 'image/gif', size: 512 }
			})
		).rejects.toThrow();
		expect(TrackService.createTrack).not.toHaveBeenCalled();
	});
});

describe('resumeTrackUpload', () => {
	it('renews both audio and cover targets', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		const res = await MusicApplicationService.resumeTrackUpload('a1', 't1');
		expect(res.uploadTargets.audio).toEqual({ renewed: 'a1/tracks/t1/source.mp3' });
		expect(res.uploadTargets.cover).toEqual({ renewed: 'a1/tracks/t1/cover.jpg' });
	});
	it('renews only the audio target when there is no cover', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(
			track({ metadata: { upload: { uploads: { audio: { key: 'a', mode: 'single' } } } } })
		);
		const res = await MusicApplicationService.resumeTrackUpload('a1', 't1');
		expect(res.uploadTargets.cover).toBeNull();
	});
	it('throws when there is no pending upload', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track({ metadata: null }));
		await expect(MusicApplicationService.resumeTrackUpload('a1', 't1')).rejects.toThrow(
			'No pending upload'
		);
	});
});

describe('createTrack with empty prior metadata', () => {
	it('merges upload metadata onto a track created with null metadata', async () => {
		(TrackService.createTrack as any).mockResolvedValue(track({ metadata: null }));
		(TrackService.updateTrack as any).mockResolvedValue(track({ metadata: null }));
		const res = await MusicApplicationService.createTrack('a1', {
			title: 'S',
			audio: { fileName: 'x.mp3', contentType: 'audio/mpeg', size: 1024 }
		});
		expect(res.uploadTargets.cover).toBeNull();
		expect(TrackService.updateTrack).toHaveBeenCalled();
	});
});

describe('finalizeTrackUpload cover + error paths', () => {
	it('throws and marks failed when the cover verify fails', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		(MediaUploadService.verifyObject as any)
			.mockResolvedValueOnce({ ok: true })
			.mockResolvedValueOnce({ ok: false, reason: 'cover missing' });
		(TrackService.updateTrack as any).mockResolvedValue(track({ status: 'failed' }));
		await expect(
			MusicApplicationService.finalizeTrackUpload('a1', 't1', {
				audioParts: [],
				coverUploaded: true
			})
		).rejects.toThrow('cover missing');
	});
	it('throws when audio upload metadata is missing', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track({ metadata: null }));
		await expect(
			MusicApplicationService.finalizeTrackUpload('a1', 't1', {
				audioParts: [],
				coverUploaded: false
			})
		).rejects.toThrow('No audio upload metadata');
	});
});

describe('updateTrackMetadata branches', () => {
	it('updates title/genres/duration without visibility or publish events', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track({ isPublished: true }));
		(TrackService.updateTrack as any).mockResolvedValue(track({ isPublished: true }));
		await MusicApplicationService.updateTrackMetadata('a1', 't1', {
			title: 'New',
			genres: ['pop'],
			duration: 200
		});
		expect(GenreService.getOrCreateGenres).toHaveBeenCalledWith(['pop']);
		expect(eventPublisher.publish).not.toHaveBeenCalled();
	});
	it('throws MusicAccessError when the track vanished during update', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		(TrackService.updateTrack as any).mockResolvedValue(null);
		await expect(
			MusicApplicationService.updateTrackMetadata('a1', 't1', { title: 'X' })
		).rejects.toBeInstanceOf(MusicAccessError);
	});
});

describe('deleteTrack failure', () => {
	it('throws when the delete does not succeed', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		(TrackService.deleteTrack as any).mockResolvedValue(false);
		await expect(MusicApplicationService.deleteTrack('a1', 't1')).rejects.toThrow(
			'Failed to delete'
		);
	});
});

describe('unlinkTrackFromAlbum', () => {
	it('unlinks when both are owned', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue({ id: 'al1', artistId: 'a1' });
		(TrackService.getTrackById as any).mockResolvedValue(track());
		(AlbumTrackService.unlinkTrackFromAlbum as any).mockResolvedValue(true);
		const res = await MusicApplicationService.unlinkTrackFromAlbum('a1', 'al1', 't1');
		expect(res).toEqual({ ok: true });
	});
	it('throws when the unlink fails', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue({ id: 'al1', artistId: 'a1' });
		(TrackService.getTrackById as any).mockResolvedValue(track());
		(AlbumTrackService.unlinkTrackFromAlbum as any).mockResolvedValue(false);
		await expect(MusicApplicationService.unlinkTrackFromAlbum('a1', 'al1', 't1')).rejects.toThrow(
			'Failed to unlink'
		);
	});
});

describe('album error branches', () => {
	it('createAlbum without genres skips genre creation', async () => {
		(AlbumService.createAlbum as any).mockResolvedValue({
			id: 'al1',
			artistId: 'a1',
			title: 'A',
			description: null,
			coverImageUrl: null,
			releaseDate: d,
			isPublished: false,
			visibility: 'public',
			genres: null,
			createdAt: d,
			updatedAt: d
		});
		const dto = await MusicApplicationService.createAlbum('a1', { title: 'A' });
		expect(dto.releaseDate).toBe(d.toISOString());
		expect(GenreService.getOrCreateGenres).not.toHaveBeenCalled();
	});
	it('updateAlbum applies all metadata fields without a visibility change', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue({
			id: 'al1',
			artistId: 'a1',
			visibility: 'public'
		});
		(AlbumService.updateAlbum as any).mockResolvedValue({
			id: 'al1',
			artistId: 'a1',
			title: 'B',
			description: 'desc',
			coverImageUrl: 'k',
			releaseDate: d,
			isPublished: true,
			visibility: 'public',
			genres: ['rock'],
			createdAt: d,
			updatedAt: d
		});
		await MusicApplicationService.updateAlbum('a1', 'al1', {
			title: 'B',
			description: 'desc',
			releaseDate: d,
			isPublished: true,
			coverImageKey: 'k',
			genres: ['rock']
		});
		expect(GenreService.getOrCreateGenres).toHaveBeenCalledWith(['rock']);
		expect(eventPublisher.publish).not.toHaveBeenCalled();
	});
	it('updateAlbum throws when the album vanished', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue({
			id: 'al1',
			artistId: 'a1',
			visibility: 'public'
		});
		(AlbumService.updateAlbum as any).mockResolvedValue(null);
		await expect(
			MusicApplicationService.updateAlbum('a1', 'al1', { title: 'X' })
		).rejects.toBeInstanceOf(MusicAccessError);
	});
	it('deleteAlbum without a cover skips R2 cleanup', async () => {
		(AlbumService.getAlbumById as any).mockResolvedValue({
			id: 'al1',
			artistId: 'a1',
			coverImageUrl: null
		});
		(AlbumService as any).deleteAlbum = vi.fn().mockResolvedValue(true);
		const res = await MusicApplicationService.deleteAlbum('a1', 'al1');
		expect(res).toEqual({ ok: true });
	});
});
