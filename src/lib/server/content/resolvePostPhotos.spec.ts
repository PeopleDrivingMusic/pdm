import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/db/services/R2Service', () => ({ headR2Object: vi.fn() }));
vi.mock('./ContentApplicationService', () => ({
	ContentApplicationService: { createMedia: vi.fn() }
}));

import { headR2Object } from '$lib/db/services/R2Service';
import { ContentApplicationService } from './ContentApplicationService';
import { PostPhotoError, resolvePostPhotoMedia } from './resolvePostPhotos';

beforeEach(() => {
	vi.clearAllMocks();
});

describe('resolvePostPhotoMedia', () => {
	it('verifies each key and creates one media row per photo, returning their ids', async () => {
		(headR2Object as any).mockResolvedValue({ exists: true, contentLength: 3 });
		(ContentApplicationService.createMedia as any)
			.mockResolvedValueOnce({ id: 'm1' })
			.mockResolvedValueOnce({ id: 'm2' });

		const ids = await resolvePostPhotoMedia('a1', [
			{ key: 'a1/content/photos/1.jpg', size: 3 },
			{ key: 'a1/content/photos/2.jpg', size: 3 }
		]);

		expect(ids).toEqual(['m1', 'm2']);
		expect(ContentApplicationService.createMedia).toHaveBeenCalledTimes(2);
		expect((ContentApplicationService.createMedia as any).mock.calls[0][0]).toMatchObject({
			artistId: 'a1',
			type: 'image',
			fileUrl: 'a1/content/photos/1.jpg'
		});
	});

	it('returns an empty list when there are no photos', async () => {
		const ids = await resolvePostPhotoMedia('a1', []);
		expect(ids).toEqual([]);
		expect(headR2Object).not.toHaveBeenCalled();
	});

	it('skips blank keys', async () => {
		(headR2Object as any).mockResolvedValue({ exists: true, contentLength: null });
		(ContentApplicationService.createMedia as any).mockResolvedValueOnce({ id: 'm1' });

		const ids = await resolvePostPhotoMedia('a1', [
			{ key: '' },
			{ key: 'a1/content/photos/1.jpg' }
		]);

		expect(ids).toEqual(['m1']);
		expect(ContentApplicationService.createMedia).toHaveBeenCalledTimes(1);
	});

	it('throws when an uploaded object is missing from R2', async () => {
		(headR2Object as any).mockResolvedValue({ exists: false });
		await expect(resolvePostPhotoMedia('a1', [{ key: 'missing.jpg' }])).rejects.toBeInstanceOf(
			PostPhotoError
		);
		expect(ContentApplicationService.createMedia).not.toHaveBeenCalled();
	});

	it('throws when the stored size does not match the declared size', async () => {
		(headR2Object as any).mockResolvedValue({ exists: true, contentLength: 999 });
		await expect(
			resolvePostPhotoMedia('a1', [{ key: 'a1/content/photos/1.jpg', size: 3 }])
		).rejects.toThrow(/size/i);
	});
});
