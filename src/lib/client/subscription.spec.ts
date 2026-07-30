import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const invalidateAll = vi.fn();
vi.mock('$app/navigation', () => ({ invalidateAll: () => invalidateAll() }));

import { subscribeToArtist, unsubscribeFromArtist } from './subscription';

beforeEach(() => {
	vi.clearAllMocks();
	global.fetch = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe('subscribeToArtist', () => {
	it('POSTs to the artist subscription endpoint and refreshes on success', async () => {
		(global.fetch as any).mockResolvedValue({ ok: true });
		const result = await subscribeToArtist('a1');
		expect(result).toEqual({ ok: true });
		const [url, init] = (global.fetch as any).mock.calls[0];
		expect(url).toBe('/api/artist/a1/subscription');
		expect(init.method).toBe('POST');
		expect(invalidateAll).toHaveBeenCalledOnce();
	});

	it('returns an error and does NOT refresh when the response is not ok', async () => {
		(global.fetch as any).mockResolvedValue({ ok: false });
		const result = await subscribeToArtist('a1');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/subscribe/i);
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	it('returns an error when fetch throws', async () => {
		(global.fetch as any).mockRejectedValue(new Error('network'));
		const result = await subscribeToArtist('a1');
		expect(result.ok).toBe(false);
		expect(invalidateAll).not.toHaveBeenCalled();
	});
});

describe('unsubscribeFromArtist', () => {
	it('DELETEs to the endpoint and refreshes on success', async () => {
		(global.fetch as any).mockResolvedValue({ ok: true });
		const result = await unsubscribeFromArtist('a2');
		expect(result).toEqual({ ok: true });
		const [url, init] = (global.fetch as any).mock.calls[0];
		expect(url).toBe('/api/artist/a2/subscription');
		expect(init.method).toBe('DELETE');
		expect(invalidateAll).toHaveBeenCalledOnce();
	});
});
