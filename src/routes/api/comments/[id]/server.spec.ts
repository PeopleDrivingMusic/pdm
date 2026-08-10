import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/comments', () => ({
	CommentService: { delete: vi.fn() }
}));

import { CommentService } from '$lib/server/comments';
import { commentWriteLimiter } from '$lib/server/comments/rateLimits';
import { DELETE } from './+server';

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
