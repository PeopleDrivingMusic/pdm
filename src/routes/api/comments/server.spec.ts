import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/comments', () => ({
	CommentService: { listForTarget: vi.fn(), create: vi.fn() }
}));

import { CommentService } from '$lib/server/comments';
import { GET, POST } from './+server';

const TARGET_ID = '11111111-1111-4111-8111-111111111111';

const viewer = {
	id: 'u2',
	displayName: 'Real Fan',
	username: 'fan2',
	avatarUrl: 'https://cdn.test/a.png'
};

const getEvt = (over: any = {}) => ({
	url: new URL(over.url ?? `http://localhost/api/comments?targetType=post&targetId=${TARGET_ID}`),
	locals: over.locals ?? {},
	request: new Request('http://localhost/api/comments', {
		method: 'GET',
		headers: { origin: 'http://localhost' }
	})
});

const postEvt = (body: unknown, locals: any = {}) => ({
	url: new URL('http://localhost/api/comments'),
	locals,
	request: new Request('http://localhost/api/comments', {
		method: 'POST',
		headers: { origin: 'http://localhost', 'content-type': 'application/json' },
		body: JSON.stringify(body)
	})
});

beforeEach(() => vi.clearAllMocks());

describe('GET /api/comments', () => {
	it('lists comments publicly for an anonymous viewer', async () => {
		(CommentService.listForTarget as any).mockResolvedValue([{ id: 'm1' }]);
		const res = await (GET as any)(getEvt());
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ comments: [{ id: 'm1' }] });
		expect(CommentService.listForTarget).toHaveBeenCalledWith({
			targetType: 'post',
			targetId: TARGET_ID,
			viewerUserId: null
		});
	});

	it('passes the logged-in viewer through', async () => {
		(CommentService.listForTarget as any).mockResolvedValue([]);
		await (GET as any)(getEvt({ locals: { user: viewer } }));
		expect(CommentService.listForTarget).toHaveBeenCalledWith(
			expect.objectContaining({ viewerUserId: 'u2' })
		);
	});

	it('400s on a missing target', async () => {
		const res = await (GET as any)(getEvt({ url: 'http://localhost/api/comments' }));
		expect(res.status).toBe(400);
	});

	it('400s on an unsupported target type', async () => {
		const res = await (GET as any)(
			getEvt({ url: `http://localhost/api/comments?targetType=artist&targetId=${TARGET_ID}` })
		);
		expect(res.status).toBe(400);
	});

	it('400s on a malformed (non-uuid) targetId instead of hitting the service', async () => {
		const res = await (GET as any)(
			getEvt({ url: 'http://localhost/api/comments?targetType=post&targetId=not-a-uuid' })
		);
		expect(res.status).toBe(400);
		expect(CommentService.listForTarget).not.toHaveBeenCalled();
	});
});

describe('POST /api/comments', () => {
	it('401s when not logged in', async () => {
		const res = await (POST as any)(
			postEvt({ targetType: 'post', targetId: TARGET_ID, body: 'hi' })
		);
		expect(res.status).toBe(401);
		expect(CommentService.create).not.toHaveBeenCalled();
	});

	it('403s a cross-origin request', async () => {
		const evt = postEvt({ targetType: 'post', targetId: TARGET_ID, body: 'hi' }, { user: viewer });
		const res = await (POST as any)({
			...evt,
			request: new Request('http://localhost/api/comments', {
				method: 'POST',
				headers: { origin: 'http://evil.test', 'content-type': 'application/json' },
				body: JSON.stringify({ targetType: 'post', targetId: TARGET_ID, body: 'hi' })
			})
		});
		expect(res.status).toBe(403);
		expect(CommentService.create).not.toHaveBeenCalled();
	});

	it('creates for a logged-in user, forwarding the session identity', async () => {
		(CommentService.create as any).mockResolvedValue({ ok: true, comment: { id: 'm1' } });
		const res = await (POST as any)(
			postEvt({ targetType: 'post', targetId: TARGET_ID, body: 'hi' }, { user: viewer })
		);
		expect(res.status).toBe(201);
		expect(CommentService.create).toHaveBeenCalledWith({
			targetType: 'post',
			targetId: TARGET_ID,
			authorId: 'u2',
			authorName: 'Real Fan',
			authorUsername: 'fan2',
			authorAvatar: 'https://cdn.test/a.png',
			body: 'hi'
		});
		expect(await res.json()).toEqual({ comment: { id: 'm1' } });
	});

	it('400s a malformed (non-uuid) targetId', async () => {
		const res = await (POST as any)(
			postEvt({ targetType: 'post', targetId: 'not-a-uuid', body: 'hi' }, { user: viewer })
		);
		expect(res.status).toBe(400);
		expect(CommentService.create).not.toHaveBeenCalled();
	});

	it('400s an invalid payload', async () => {
		const res = await (POST as any)(postEvt({ targetType: 'post' }, { user: viewer }));
		expect(res.status).toBe(400);
		expect(CommentService.create).not.toHaveBeenCalled();
	});

	it('422s a rejected comment (e.g. links)', async () => {
		(CommentService.create as any).mockResolvedValue({ ok: false, reason: 'links_not_allowed' });
		const res = await (POST as any)(
			postEvt({ targetType: 'post', targetId: TARGET_ID, body: 'see scam.com' }, { user: viewer })
		);
		expect(res.status).toBe(422);
		expect(await res.json()).toEqual({ error: 'links_not_allowed' });
	});

	it('429s once the per-user write limit is exceeded', async () => {
		(CommentService.create as any).mockResolvedValue({ ok: true, comment: { id: 'm1' } });
		const send = () =>
			(POST as any)(
				postEvt({ targetType: 'post', targetId: TARGET_ID, body: 'spam' }, { user: viewer })
			);
		const statuses: number[] = [];
		for (let i = 0; i < 12; i++) statuses.push((await send()).status);
		expect(statuses).toContain(429);
	});
});
