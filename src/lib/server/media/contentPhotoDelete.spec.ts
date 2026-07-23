import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/db/services/R2Service', () => ({ deleteFileFromR2: vi.fn() }));

import { deleteFileFromR2 } from '$lib/db/services/R2Service';
import { deleteOwnedContentPhotos, isOwnedContentPhotoKey } from './contentPhotoDelete';

beforeEach(() => vi.clearAllMocks());

describe('isOwnedContentPhotoKey', () => {
	it('accepts a key under the artist content-photo prefix', () => {
		expect(isOwnedContentPhotoKey('a1', 'a1/content/photos/123-shot.jpg')).toBe(true);
	});
	it('rejects a key belonging to another artist', () => {
		expect(isOwnedContentPhotoKey('a1', 'a2/content/photos/123-shot.jpg')).toBe(false);
	});
	it('rejects a key outside the content-photo namespace', () => {
		expect(isOwnedContentPhotoKey('a1', 'a1/tracks/t1/source.mp3')).toBe(false);
	});
});

describe('deleteOwnedContentPhotos', () => {
	it('deletes only owned keys from the images bucket and returns the count', async () => {
		(deleteFileFromR2 as any).mockResolvedValue(true);

		const deleted = await deleteOwnedContentPhotos('a1', [
			'a1/content/photos/1.jpg',
			'a2/content/photos/evil.jpg',
			'a1/content/photos/2.jpg'
		]);

		expect(deleted).toBe(2);
		expect(deleteFileFromR2).toHaveBeenCalledTimes(2);
		expect(deleteFileFromR2).toHaveBeenCalledWith({
			uniqueKey: 'a1/content/photos/1.jpg',
			bucket: 'images'
		});
		expect(deleteFileFromR2).not.toHaveBeenCalledWith(
			expect.objectContaining({ uniqueKey: 'a2/content/photos/evil.jpg' })
		);
	});

	it('returns zero for an empty list', async () => {
		expect(await deleteOwnedContentPhotos('a1', [])).toBe(0);
		expect(deleteFileFromR2).not.toHaveBeenCalled();
	});
});
