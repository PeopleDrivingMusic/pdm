import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/music', () => ({
	MusicApplicationService: {
		createAlbumCover: vi.fn(),
		replaceTrackImage: vi.fn(async () => ({ uploadTarget: { kind: 'track-cover', key: 'tc' } })),
		replaceTrackAudio: vi.fn(async () => ({
			uploadTargets: { audio: { kind: 'track-audio', key: 'ta' }, cover: null }
		}))
	}
}));
vi.mock('./index', () => ({
	MediaUploadService: {
		createContentPhotoUpload: vi.fn(async () => ({ kind: 'content-photo', key: 'k' }))
	}
}));

import { MusicApplicationService } from '$lib/server/music';
import { resolveUploadTarget } from './uploadTargetHandler';

beforeEach(() => vi.clearAllMocks());

const intent = { fileName: 'c.png', contentType: 'image/png', size: 10 };

describe('resolveUploadTarget', () => {
	it('rejects an unknown kind', async () => {
		const res = await resolveUploadTarget('a1', { kind: 'nope', ...intent });
		expect(res).toMatchObject({ status: 400 });
	});
	it('rejects missing file metadata', async () => {
		const res = await resolveUploadTarget('a1', { kind: 'album-cover', albumId: 'al1' });
		expect(res).toMatchObject({ status: 400 });
	});
	it('requires albumId for album-cover', async () => {
		const res = await resolveUploadTarget('a1', { kind: 'album-cover', ...intent });
		expect(res).toMatchObject({ status: 400 });
	});
	it('delegates album-cover to the boundary (ownership inside)', async () => {
		(MusicApplicationService.createAlbumCover as any).mockResolvedValue({
			uploadTarget: { kind: 'album-cover', key: 'a1/albums/al1/cover.png' }
		});
		const res = await resolveUploadTarget('a1', { kind: 'album-cover', albumId: 'al1', ...intent });
		expect(MusicApplicationService.createAlbumCover).toHaveBeenCalledWith(
			'a1',
			'al1',
			expect.any(Object)
		);
		expect((res as any).upload.key).toBe('a1/albums/al1/cover.png');
	});
	it('delegates content-photo to the media service', async () => {
		const res = await resolveUploadTarget('a1', { kind: 'content-photo', ...intent });
		expect((res as any).upload.kind).toBe('content-photo');
	});
	it('delegates track-cover to the boundary and requires trackId', async () => {
		expect(await resolveUploadTarget('a1', { kind: 'track-cover', ...intent })).toMatchObject({
			status: 400
		});
		const res = await resolveUploadTarget('a1', { kind: 'track-cover', trackId: 't1', ...intent });
		expect((res as any).upload.key).toBe('tc');
	});
	it('delegates track-audio to the boundary and requires trackId', async () => {
		expect(await resolveUploadTarget('a1', { kind: 'track-audio', ...intent })).toMatchObject({
			status: 400
		});
		const res = await resolveUploadTarget('a1', { kind: 'track-audio', trackId: 't1', ...intent });
		expect((res as any).upload.key).toBe('ta');
	});
	it('maps a boundary 404 to a typed error', async () => {
		const err: any = new Error('Album not found');
		err.status = 404;
		(MusicApplicationService.createAlbumCover as any).mockRejectedValue(err);
		const res = await resolveUploadTarget('a1', { kind: 'album-cover', albumId: 'x', ...intent });
		expect(res).toMatchObject({ status: 404 });
	});
});
