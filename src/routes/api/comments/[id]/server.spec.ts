import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/comments', () => ({
	CommentService: { delete: vi.fn(), edit: vi.fn() }
}));

import { CommentService } from '$lib/server/comments';
import { commentWriteLimiter } from '$lib/server/comments/rateLimits';
import { DELETE, PUT } from './+server';

const COMMENT_ID = '22222222-2222-4222-8222-222222222222';

const evt = (locals: any, id = COMMENT_ID, origin = 'http://localhost') => ({
	params: { id },
	locals,
	url: new URL(`http://localhost/api/comments/${id}`),
	getClientAddress: () => '1.2.3.4',
	request: new Request(`http://localhost/api/comments/${id}`, {
		method: 'DELETE',
		headers: { origin }
	})
});

beforeEach(() => {
	vi.clearAllMocks();
	commentWriteLimiter.reset();
});

describe('DELETE /api/comments/[id]', () => {
	it('401s when not logged in', async () => {
		const res = await (DELETE as any)(evt({}));
		expect(res.status).toBe(401);
		expect(CommentService.delete).not.toHaveBeenCalled();
	});

	it('403s a cross-origin request', async () => {
		const res = await (DELETE as any)(evt({ user: { id: 'u2' } }, COMMENT_ID, 'http://evil.test'));
		expect(res.status).toBe(403);
		expect(CommentService.delete).not.toHaveBeenCalled();
	});

	it('deletes for an authorized user', async () => {
		(CommentService.delete as any).mockResolvedValue({ ok: true });
		const res = await (DELETE as any)(evt({ user: { id: 'u2' } }));
		expect(res.status).toBe(200);
		expect(CommentService.delete).toHaveBeenCalledWith({ commentId: COMMENT_ID, userId: 'u2' });
	});

	it('403s a forbidden delete', async () => {
		(CommentService.delete as any).mockResolvedValue({ ok: false, reason: 'forbidden' });
		const res = await (DELETE as any)(evt({ user: { id: 'stranger' } }));
		expect(res.status).toBe(403);
	});

	it('404s a missing comment', async () => {
		(CommentService.delete as any).mockResolvedValue({ ok: false, reason: 'not_found' });
		const res = await (DELETE as any)(evt({ user: { id: 'u2' } }));
		expect(res.status).toBe(404);
	});

	it('400s a malformed (non-uuid) comment id', async () => {
		const res = await (DELETE as any)(evt({ user: { id: 'u2' } }, 'not-a-uuid'));
		expect(res.status).toBe(400);
		expect(CommentService.delete).not.toHaveBeenCalled();
	});

	it('429s once the per-user write limit is exceeded', async () => {
		(CommentService.delete as any).mockResolvedValue({ ok: true });
		const statuses: number[] = [];
		for (let i = 0; i < 12; i++) {
			statuses.push((await (DELETE as any)(evt({ user: { id: 'u2' } }))).status);
		}
		expect(statuses.filter((s) => s === 200)).toHaveLength(10);
		expect(statuses.slice(10)).toEqual([429, 429]);
	});
});

describe('PUT /api/comments/[id]', () => {
	const editor = {
		id: 'u2',
		displayName: 'Real Fan',
		username: 'fan2',
		avatarUrl: 'https://cdn.test/a.png'
	};

	const putEvt = (
		body: unknown,
		locals: any = {},
		id = COMMENT_ID,
		origin = 'http://localhost'
	) => ({
		params: { id },
		locals,
		url: new URL(`http://localhost/api/comments/${id}`),
		getClientAddress: () => '1.2.3.4',
		request: new Request(`http://localhost/api/comments/${id}`, {
			method: 'PUT',
			headers: { origin, 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	});

	it('401s when not logged in', async () => {
		const res = await (PUT as any)(putEvt({ body: 'edited' }));
		expect(res.status).toBe(401);
		expect(CommentService.edit).not.toHaveBeenCalled();
	});

	it('403s a cross-origin request', async () => {
		const res = await (PUT as any)(
			putEvt({ body: 'edited' }, { user: editor }, COMMENT_ID, 'http://evil.test')
		);
		expect(res.status).toBe(403);
		expect(CommentService.edit).not.toHaveBeenCalled();
	});

	it('edits, forwarding the session identity', async () => {
		(CommentService.edit as any).mockResolvedValue({
			ok: true,
			comment: { id: COMMENT_ID, body: 'edited' }
		});
		const res = await (PUT as any)(putEvt({ body: 'edited' }, { user: editor }));
		expect(res.status).toBe(200);
		expect(CommentService.edit).toHaveBeenCalledWith({
			commentId: COMMENT_ID,
			userId: 'u2',
			authorName: 'Real Fan',
			authorUsername: 'fan2',
			authorAvatar: 'https://cdn.test/a.png',
			body: 'edited'
		});
		expect(await res.json()).toEqual({ comment: { id: COMMENT_ID, body: 'edited' } });
	});

	it('400s a malformed (non-uuid) comment id', async () => {
		const res = await (PUT as any)(putEvt({ body: 'x' }, { user: editor }, 'not-a-uuid'));
		expect(res.status).toBe(400);
		expect(CommentService.edit).not.toHaveBeenCalled();
	});

	it('400s a missing body', async () => {
		const res = await (PUT as any)(putEvt({}, { user: editor }));
		expect(res.status).toBe(400);
		expect(CommentService.edit).not.toHaveBeenCalled();
	});

	it('403s when the editor is not the author', async () => {
		(CommentService.edit as any).mockResolvedValue({ ok: false, reason: 'forbidden' });
		const res = await (PUT as any)(putEvt({ body: 'nope' }, { user: editor }));
		expect(res.status).toBe(403);
	});

	it('404s a missing comment', async () => {
		(CommentService.edit as any).mockResolvedValue({ ok: false, reason: 'not_found' });
		const res = await (PUT as any)(putEvt({ body: 'x' }, { user: editor }));
		expect(res.status).toBe(404);
	});

	it('422s an edit that introduces a link', async () => {
		(CommentService.edit as any).mockResolvedValue({ ok: false, reason: 'links_not_allowed' });
		const res = await (PUT as any)(putEvt({ body: 'now scam.com' }, { user: editor }));
		expect(res.status).toBe(422);
		expect(await res.json()).toEqual({ error: 'links_not_allowed' });
	});

	it('400s an empty edit', async () => {
		(CommentService.edit as any).mockResolvedValue({ ok: false, reason: 'empty' });
		const res = await (PUT as any)(putEvt({ body: '  ' }, { user: editor }));
		expect(res.status).toBe(400);
	});

	it('shares the per-user write budget with delete', async () => {
		(CommentService.edit as any).mockResolvedValue({ ok: true, comment: { id: COMMENT_ID } });
		(CommentService.delete as any).mockResolvedValue({ ok: true });

		// 5 edits + 5 deletes exhaust the same 10/min budget; the 11th call is refused.
		for (let i = 0; i < 5; i++) await (PUT as any)(putEvt({ body: 'x' }, { user: editor }));
		for (let i = 0; i < 5; i++) await (DELETE as any)(evt({ user: editor }));

		const refused = await (PUT as any)(putEvt({ body: 'x' }, { user: editor }));
		expect(refused.status).toBe(429);
		expect(refused.headers.get('Retry-After')).toBe('60');
	});
});
