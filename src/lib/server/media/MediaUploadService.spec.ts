import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/services/R2Service', () => ({
	createPresignedPutUrl: vi.fn(async (i) => ({
		mode: 'single',
		bucket: i.bucket,
		key: i.key,
		url: 'https://r2/put',
		expiresIn: 900
	})),
	createMultipartUpload: vi.fn(),
	signMultipartParts: vi.fn(),
	completeMultipartUpload: vi.fn(),
	headR2Object: vi.fn(),
	R2_MULTIPART_PART_SIZE: 8 * 1024 * 1024
}));

import { MediaUploadService } from './MediaUploadService';

beforeEach(() => vi.clearAllMocks());

describe('createAlbumCoverUpload', () => {
	it('derives an artist/album-namespaced key in the images bucket', async () => {
		const target = await MediaUploadService.createAlbumCoverUpload({
			artistId: 'a1',
			albumId: 'al1',
			fileName: 'My Cover.PNG',
			contentType: 'image/png',
			size: 2048
		});
		expect(target.kind).toBe('album-cover');
		expect(target.bucket).toBe('images');
		expect(target.key).toBe('a1/albums/al1/cover.png');
		expect(target.target.mode).toBe('single');
	});
});
