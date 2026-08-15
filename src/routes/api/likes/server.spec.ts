import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/likes', () => ({
	LikeService: { toggle: vi.fn() }
}));

import { LikeService } from '$lib/server/likes';
import { likeWriteLimiter } from '$lib/server/likes/rateLimits';
import { POST } from './+server';

const TARGET_ID = '33333333-3333-4333-8333-333333333333';
const viewer = { id: 'u2' };

const evt = (body: unknown, locals: any = {}, origin = 'http://localhost') => ({
	url: new URL('http://localhost/api/likes'),
	locals,
	getClientAddress: () => '1.2.3.4',
	request: new Request('http://localhost/api/likes', {
		method: 'POST',
		headers: { origin, 'content-type': 'application/json' },
		body: JSON.stringify(body)
	})
});

beforeEach(() => {
	vi.clearAllMocks();
	likeWriteLimiter.reset();
});

describe('POST /api/likes', () => {
	it('401s when not logged in', async () => {
		const res = await (POST as any)(evt({ targetType: 'comment', targetId: TARGET_ID }));
		expect(res.status).toBe(401);
		expect(LikeService.toggle).not.toHaveBeenCalled();
	});

	it('403s a cross-origin request', async () => {
		const res = await (POST as any)(
			evt({ targetType: 'comment', targetId: TARGET_ID }, { user: viewer }, 'http://evil.test')
		);
		expect(res.status).toBe(403);
		expect(LikeService.toggle).not.toHaveBeenCalled();
	});

	it('toggles a like and returns the new state', async () => {
		(LikeService.toggle as any).mockResolvedValue({ ok: true, liked: true, likeCount: 4 });
		const res = await (POST as any)(
			evt({ targetType: 'comment', targetId: TARGET_ID }, { user: viewer })
		);

		expect(res.status).toBe(200);
		expect(LikeService.toggle).toHaveBeenCalledWith('comment', TARGET_ID, 'u2');
		expect(await res.json()).toEqual({ liked: true, likeCount: 4 });
	});

	it('accepts a post target too', async () => {
		(LikeService.toggle as any).mockResolvedValue({ ok: true, liked: false, likeCount: 0 });
		const res = await (POST as any)(
			evt({ targetType: 'post', targetId: TARGET_ID }, { user: viewer })
		);
		expect(res.status).toBe(200);
		expect(LikeService.toggle).toHaveBeenCalledWith('post', TARGET_ID, 'u2');
	});

	it('400s an unsupported target type before reaching the service', async () => {
		const res = await (POST as any)(
			evt({ targetType: 'artist', targetId: TARGET_ID }, { user: viewer })
		);
		expect(res.status).toBe(400);
		expect(LikeService.toggle).not.toHaveBeenCalled();
	});

	it('400s a malformed (non-uuid) target id', async () => {
		const res = await (POST as any)(
			evt({ targetType: 'comment', targetId: 'not-a-uuid' }, { user: viewer })
		);
		expect(res.status).toBe(400);
		expect(LikeService.toggle).not.toHaveBeenCalled();
	});

	it('404s a target the service cannot resolve', async () => {
		(LikeService.toggle as any).mockResolvedValue({ ok: false, reason: 'invalid_target' });
		const res = await (POST as any)(
			evt({ targetType: 'comment', targetId: TARGET_ID }, { user: viewer })
		);
		expect(res.status).toBe(404);
	});

	it('429s once the per-user like budget is spent', async () => {
		(LikeService.toggle as any).mockResolvedValue({ ok: true, liked: true, likeCount: 1 });
		const send = () =>
			(POST as any)(evt({ targetType: 'comment', targetId: TARGET_ID }, { user: viewer }));

		const statuses: number[] = [];
		for (let i = 0; i < 32; i++) statuses.push((await send()).status);

		expect(statuses.filter((s) => s === 200)).toHaveLength(30);
		expect(statuses.slice(30)).toEqual([429, 429]);
	});
});
