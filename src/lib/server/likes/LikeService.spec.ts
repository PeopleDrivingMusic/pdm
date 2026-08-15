import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/services/LikeRepository', () => ({
	LikeRepository: {
		toggle: vi.fn(),
		countForTargets: vi.fn(),
		likedByUser: vi.fn()
	}
}));

vi.mock('$lib/server/messages/access', () => ({
	resolveTargetAccess: vi.fn()
}));

import { LikeRepository } from '$lib/db/services/LikeRepository';
import { resolveTargetAccess } from '$lib/server/messages/access';
import { LikeService } from './LikeService';

beforeEach(() => {
	vi.clearAllMocks();
	(resolveTargetAccess as any).mockResolvedValue({ ok: true, ownerUserId: 'owner1' });
});

describe('toggle', () => {
	it('likes a comment and reports the new state', async () => {
		(LikeRepository.toggle as any).mockResolvedValue(true);
		(LikeRepository.countForTargets as any).mockResolvedValue(new Map([['c1', 4]]));

		const result = await LikeService.toggle('comment', 'c1', 'u1');

		expect(LikeRepository.toggle).toHaveBeenCalledWith('comment', 'c1', 'u1');
		expect(result).toEqual({ ok: true, liked: true, likeCount: 4 });
	});

	it('unlikes and reports the decremented count', async () => {
		(LikeRepository.toggle as any).mockResolvedValue(false);
		(LikeRepository.countForTargets as any).mockResolvedValue(new Map([['c1', 3]]));

		const result = await LikeService.toggle('comment', 'c1', 'u1');
		expect(result).toEqual({ ok: true, liked: false, likeCount: 3 });
	});

	it('reports zero when the target has no likes left', async () => {
		(LikeRepository.toggle as any).mockResolvedValue(false);
		(LikeRepository.countForTargets as any).mockResolvedValue(new Map());

		const result = await LikeService.toggle('post', 'p1', 'u1');
		expect(result).toEqual({ ok: true, liked: false, likeCount: 0 });
	});

	it('routes a post target to the post table', async () => {
		(LikeRepository.toggle as any).mockResolvedValue(true);
		(LikeRepository.countForTargets as any).mockResolvedValue(new Map([['p1', 1]]));

		await LikeService.toggle('post', 'p1', 'u1');
		expect(LikeRepository.toggle).toHaveBeenCalledWith('post', 'p1', 'u1');
	});

	it('refuses a target the viewer cannot see, without writing a like', async () => {
		// Liking must not be easier than reading: a draft or gated post is off limits,
		// and no count comes back to leak activity on it.
		(resolveTargetAccess as any).mockResolvedValue({ ok: false });

		const result = await LikeService.toggle('post', 'p1', 'u1');

		expect(result).toEqual({ ok: false, reason: 'invalid_target' });
		expect(LikeRepository.toggle).not.toHaveBeenCalled();
		expect(LikeRepository.countForTargets).not.toHaveBeenCalled();
	});

	it('checks access before touching the like table', async () => {
		(LikeRepository.toggle as any).mockResolvedValue(true);
		(LikeRepository.countForTargets as any).mockResolvedValue(new Map([['c1', 1]]));

		await LikeService.toggle('comment', 'c1', 'u1');
		expect(resolveTargetAccess).toHaveBeenCalledWith('comment', 'c1', 'u1');
	});

	it('rejects an unknown target type without touching the DB', async () => {
		const result = await LikeService.toggle('artist' as any, 'a1', 'u1');
		expect(result).toEqual({ ok: false, reason: 'invalid_target' });
		expect(LikeRepository.toggle).not.toHaveBeenCalled();
	});
});

describe('summaryFor', () => {
	it('pairs counts with what the viewer already liked', async () => {
		(LikeRepository.countForTargets as any).mockResolvedValue(
			new Map([
				['c1', 5],
				['c2', 2]
			])
		);
		(LikeRepository.likedByUser as any).mockResolvedValue(new Set(['c2']));

		const result = await LikeService.summaryFor('comment', ['c1', 'c2'], 'u1');

		expect(result.get('c1')).toEqual({ likeCount: 5, likedByViewer: false });
		expect(result.get('c2')).toEqual({ likeCount: 2, likedByViewer: true });
	});

	it('defaults a target with no likes to an empty summary', async () => {
		(LikeRepository.countForTargets as any).mockResolvedValue(new Map());
		(LikeRepository.likedByUser as any).mockResolvedValue(new Set());

		const result = await LikeService.summaryFor('comment', ['c9'], 'u1');
		expect(result.get('c9')).toEqual({ likeCount: 0, likedByViewer: false });
	});

	it('never asks what an anonymous viewer liked', async () => {
		(LikeRepository.countForTargets as any).mockResolvedValue(new Map([['c1', 5]]));

		const result = await LikeService.summaryFor('comment', ['c1'], null);

		expect(LikeRepository.likedByUser).not.toHaveBeenCalled();
		expect(result.get('c1')).toEqual({ likeCount: 5, likedByViewer: false });
	});

	it('skips the DB entirely for an empty id list', async () => {
		const result = await LikeService.summaryFor('comment', [], 'u1');
		expect(result.size).toBe(0);
		expect(LikeRepository.countForTargets).not.toHaveBeenCalled();
	});
});
