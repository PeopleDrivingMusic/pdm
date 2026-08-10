import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchComments, createComment, editComment, deleteComment } from './comments';

const TARGET_ID = '11111111-1111-4111-8111-111111111111';

function mockFetch(status: number, body: unknown) {
	const fn = vi.fn().mockResolvedValue({
		ok: status >= 200 && status < 300,
		status,
		json: async () => body
	});
	vi.stubGlobal('fetch', fn);
	return fn;
}

beforeEach(() => vi.unstubAllGlobals());

describe('fetchComments', () => {
	it('requests the target and returns the list', async () => {
		const fn = mockFetch(200, { comments: [{ id: 'm1' }] });
		const result = await fetchComments('post', TARGET_ID);

		expect(fn).toHaveBeenCalledWith(
			`/api/comments?targetType=post&targetId=${TARGET_ID}`,
			expect.anything()
		);
		expect(result).toEqual({ ok: true, comments: [{ id: 'm1' }] });
	});

	it('reports a failure without throwing', async () => {
		mockFetch(500, {});
		const result = await fetchComments('post', TARGET_ID);
		expect(result.ok).toBe(false);
	});
});

describe('createComment', () => {
	it('posts the payload and returns the created comment', async () => {
		const fn = mockFetch(201, { comment: { id: 'm1', body: 'hi' } });
		const result = await createComment('post', TARGET_ID, 'hi');

		expect(fn).toHaveBeenCalledWith(
			'/api/comments',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ targetType: 'post', targetId: TARGET_ID, body: 'hi' })
			})
		);
		expect(result).toEqual({ ok: true, comment: { id: 'm1', body: 'hi' } });
	});

	it('surfaces the link-policy refusal as a readable message', async () => {
		mockFetch(422, { error: 'links_not_allowed' });
		const result = await createComment('post', TARGET_ID, 'see scam.com');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/link/i);
	});

	it('surfaces the rate limit as a readable message', async () => {
		mockFetch(429, { error: 'rate_limited' });
		const result = await createComment('post', TARGET_ID, 'spam');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toMatch(/too fast|slow/i);
	});
});

describe('editComment', () => {
	it('PUTs the new body', async () => {
		const fn = mockFetch(200, { comment: { id: 'm1', body: 'edited' } });
		const result = await editComment('m1', 'edited');

		expect(fn).toHaveBeenCalledWith(
			'/api/comments/m1',
			expect.objectContaining({ method: 'PUT', body: JSON.stringify({ body: 'edited' }) })
		);
		expect(result).toEqual({ ok: true, comment: { id: 'm1', body: 'edited' } });
	});
});

describe('deleteComment', () => {
	it('DELETEs the comment', async () => {
		const fn = mockFetch(200, { deleted: true });
		const result = await deleteComment('m1');

		expect(fn).toHaveBeenCalledWith(
			'/api/comments/m1',
			expect.objectContaining({ method: 'DELETE' })
		);
		expect(result.ok).toBe(true);
	});

	it('reports a forbidden delete', async () => {
		mockFetch(403, { error: 'forbidden' });
		const result = await deleteComment('m1');
		expect(result.ok).toBe(false);
	});
});
