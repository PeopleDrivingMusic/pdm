import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/queries', () => ({
	TrackService: { createTrack: vi.fn(), updateTrack: vi.fn(), getTrackById: vi.fn() },
	GenreService: { getOrCreateGenres: vi.fn() },
	AlbumService: {},
	AlbumTrackService: {}
}));
vi.mock('$lib/server/media', () => ({
	MediaUploadService: {
		createTrackAudioUpload: vi.fn(),
		createTrackCoverUpload: vi.fn(),
		toStoredTarget: vi.fn((t) => ({ stored: t.key })),
		renewStoredTarget: vi.fn(),
		completeMultipart: vi.fn(),
		verifyObject: vi.fn()
	}
}));
vi.mock('$lib/server/events', () => ({ eventPublisher: { publish: vi.fn() } }));

import { TrackService, GenreService } from '$lib/db/queries';
import { MediaUploadService } from '$lib/server/media';
import { eventPublisher } from '$lib/server/events';
import { MusicApplicationService } from './MusicApplicationService';
import { MAX_AUDIO_SIZE } from '../media/validation';

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
		upload: { uploads: { audio: { key: 'a1/tracks/t1/source.mp3', mode: 'single' } } }
	},
	createdAt: d,
	updatedAt: d,
	...over
});

beforeEach(() => vi.clearAllMocks());

describe('createTrack', () => {
	it('rejects an oversize audio file before creating anything', async () => {
		await expect(
			MusicApplicationService.createTrack('a1', {
				title: 'S',
				audio: { fileName: 'x.mp3', contentType: 'audio/mpeg', size: MAX_AUDIO_SIZE + 1 }
			})
		).rejects.toThrow();
		expect(TrackService.createTrack).not.toHaveBeenCalled();
	});

	it('creates a pending track and returns upload targets', async () => {
		(TrackService.createTrack as any).mockResolvedValue(track());
		(TrackService.updateTrack as any).mockResolvedValue(track());
		(GenreService.getOrCreateGenres as any).mockResolvedValue([]);
		(MediaUploadService.createTrackAudioUpload as any).mockResolvedValue({
			key: 'a1/tracks/t1/source.mp3',
			target: { mode: 'single' }
		});

		const result = await MusicApplicationService.createTrack('a1', {
			title: 'S',
			visibility: 'subscribers_only',
			audio: { fileName: 'x.mp3', contentType: 'audio/mpeg', size: 1024 }
		});

		expect(TrackService.createTrack).toHaveBeenCalledWith(
			expect.objectContaining({
				artistId: 'a1',
				status: 'pending_upload',
				visibility: 'subscribers_only'
			})
		);
		expect(result.uploadTargets.audio).toBeDefined();
		expect(result.track.id).toBe('t1');
	});
});

describe('finalizeTrackUpload', () => {
	it('verifies, marks uploaded and emits track.uploaded', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		(MediaUploadService.verifyObject as any).mockResolvedValue({ ok: true });
		(TrackService.updateTrack as any).mockResolvedValue(track({ status: 'uploaded' }));

		const res = await MusicApplicationService.finalizeTrackUpload('a1', 't1', {
			audioParts: [],
			coverUploaded: false
		});

		expect(TrackService.updateTrack).toHaveBeenCalledWith(
			't1',
			expect.objectContaining({ status: 'uploaded' })
		);
		expect(eventPublisher.publish).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'track.uploaded', trackId: 't1' })
		);
		expect(res.track.status).toBe('uploaded');
	});

	it('marks failed and throws on verify mismatch', async () => {
		(TrackService.getTrackById as any).mockResolvedValue(track());
		(MediaUploadService.verifyObject as any).mockResolvedValue({
			ok: false,
			reason: 'size mismatch'
		});
		(TrackService.updateTrack as any).mockResolvedValue(track({ status: 'failed' }));
		await expect(
			MusicApplicationService.finalizeTrackUpload('a1', 't1', {
				audioParts: [],
				coverUploaded: false
			})
		).rejects.toThrow('size mismatch');
		expect(eventPublisher.publish).not.toHaveBeenCalled();
	});
});
