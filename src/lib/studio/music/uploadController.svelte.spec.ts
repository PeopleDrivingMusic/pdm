import { expect, test, vi, beforeEach } from 'vitest';

vi.mock('$lib/utils/helpers', () => ({
	uploadR2Target: vi.fn(async ({ onProgress }: { onProgress?: (p: number) => void }) => {
		onProgress?.(100);
		return { key: 'k', mode: 'single', parts: [] };
	}),
	clearUploadResumeState: vi.fn()
}));
vi.mock('$app/forms', () => ({ deserialize: vi.fn(() => ({ type: 'success', data: {} })) }));
vi.mock('$app/navigation', () => ({ invalidateAll: vi.fn() }));
vi.mock('$lib/stores/notification.svelte', () => ({
	notificationStore: { success: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

import { createUploadController } from './uploadController.svelte';

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response('{}'))
	);
});

function target() {
	return {
		kind: 'track-audio',
		bucket: 'music',
		key: 'k',
		contentType: 'audio/mpeg',
		size: 10,
		target: { mode: 'single', bucket: 'music', key: 'k', url: 'u' }
	} as any;
}

test('enqueue auto-runs the job to completion (removed after finalize)', async () => {
	const c = createUploadController();
	c.enqueue({
		trackId: 't1',
		title: 'S',
		audioFile: new File(['x'], 's.mp3'),
		coverFile: null,
		uploadTargets: { audio: target(), cover: null }
	});
	await vi.waitFor(() => expect(c.list().find((j) => j.trackId === 't1')).toBeUndefined());
	c.destroy();
});

test('destroy revokes cover preview URLs', () => {
	const revoke = vi.spyOn(URL, 'revokeObjectURL');
	const c = createUploadController();
	c.enqueue({
		trackId: 't2',
		title: 'S',
		audioFile: new File(['x'], 's.mp3'),
		coverFile: new File(['y'], 'c.jpg', { type: 'image/jpeg' }),
		uploadTargets: { audio: target(), cover: target() }
	});
	c.destroy();
	expect(revoke).toHaveBeenCalled();
});
