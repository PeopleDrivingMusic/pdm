import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/utils/helpers', () => ({
	uploadR2Target: vi.fn().mockResolvedValue(undefined)
}));

import { uploadR2Target } from '$lib/utils/helpers';
import { beaconDeleteContentPhotos, deleteContentPhotos, preparePostPhoto } from './postPhotos';

const file = (name = 'shot.jpg', type = 'image/jpeg') =>
	new File([new Uint8Array([1, 2, 3])], name, { type });

function mockTarget(key: string) {
	return {
		ok: true,
		json: async () => ({
			upload: {
				kind: 'content-photo',
				bucket: 'images',
				key,
				contentType: 'image/jpeg',
				size: 3,
				target: { mode: 'single', bucket: 'images', key, url: 'https://r2/put' }
			}
		})
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	global.fetch = vi.fn();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('preparePostPhoto', () => {
	it('requests a content-photo upload target and uploads to R2, returning the key', async () => {
		(global.fetch as any).mockResolvedValueOnce(mockTarget('a1/content/photos/one.jpg'));

		const result = await preparePostPhoto(file('one.jpg'));

		const [url, init] = (global.fetch as any).mock.calls[0];
		expect(url).toBe('/api/studio/media/upload-target');
		const body = JSON.parse(init.body);
		expect(body).toMatchObject({ kind: 'content-photo', fileName: 'one.jpg', size: 3 });
		expect(uploadR2Target).toHaveBeenCalledTimes(1);
		expect((uploadR2Target as any).mock.calls[0][0].upload.key).toBe('a1/content/photos/one.jpg');
		expect(result).toMatchObject({ key: 'a1/content/photos/one.jpg', size: 3 });
	});

	it('throws when the upload target request fails', async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: false,
			json: async () => ({ error: 'File too large' })
		});

		await expect(preparePostPhoto(file())).rejects.toThrow('File too large');
		expect(uploadR2Target).not.toHaveBeenCalled();
	});
});

describe('deleteContentPhotos', () => {
	it('posts the keys to the delete endpoint', async () => {
		(global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ deleted: 2 }) });

		await deleteContentPhotos(['a1/content/photos/1.jpg', 'a1/content/photos/2.jpg']);

		const [url, init] = (global.fetch as any).mock.calls[0];
		expect(url).toBe('/api/studio/media/content-photo/delete');
		expect(init.method).toBe('POST');
		expect(JSON.parse(init.body)).toEqual({
			keys: ['a1/content/photos/1.jpg', 'a1/content/photos/2.jpg']
		});
	});

	it('does nothing for an empty list', async () => {
		await deleteContentPhotos([]);
		expect(global.fetch).not.toHaveBeenCalled();
	});
});

describe('beaconDeleteContentPhotos', () => {
	it('sends the keys via navigator.sendBeacon', () => {
		const sendBeacon = vi.fn();
		vi.stubGlobal('navigator', { sendBeacon });

		beaconDeleteContentPhotos(['a1/content/photos/1.jpg']);

		expect(sendBeacon).toHaveBeenCalledOnce();
		expect(sendBeacon.mock.calls[0][0]).toBe('/api/studio/media/content-photo/delete');
		vi.unstubAllGlobals();
	});

	it('does nothing for an empty list', () => {
		const sendBeacon = vi.fn();
		vi.stubGlobal('navigator', { sendBeacon });
		beaconDeleteContentPhotos([]);
		expect(sendBeacon).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
	});
});
