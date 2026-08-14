import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * A minimal thenable stand-in for Drizzle's chainable query builder. Every
 * chain method records its call and returns the same object, and `await`
 * resolves it to `result` — enough to drive `LikeRepository` without a real
 * connection, while still catching a wrong-shaped `.values()` call: that's
 * exactly the class of bug that shipped (the DB column name used as the
 * insert's TS property key) and that the real DB round-trip in
 * `e2e/comments.spec.ts` catches far more slowly.
 */
function makeChain(result: unknown, onCall?: (method: string, args: unknown[]) => void) {
	const chain: Record<string, unknown> = {
		then: (resolve: (value: unknown) => void) => resolve(result)
	};
	for (const method of ['where', 'from', 'groupBy', 'returning', 'values', 'onConflictDoNothing']) {
		chain[method] = (...args: unknown[]) => {
			onCall?.(method, args);
			return chain;
		};
	}
	return chain;
}

const dbMock = vi.hoisted(() => ({
	delete: vi.fn(),
	insert: vi.fn(),
	select: vi.fn()
}));

vi.mock('../index', () => ({
	db: dbMock,
	withDbLogging: (_name: string, fn: () => unknown) => fn()
}));

import { LikeRepository } from './LikeRepository';

beforeEach(() => {
	vi.clearAllMocks();
});

describe('LikeRepository.toggle', () => {
	it('inserts a comment like keyed by the TS property name, not the db column name', async () => {
		let valuesCall: unknown;
		dbMock.delete.mockReturnValue(makeChain([]));
		dbMock.insert.mockReturnValue(
			makeChain(undefined, (method, args) => {
				if (method === 'values') valuesCall = args[0];
			})
		);

		const liked = await LikeRepository.toggle('comment', 'c1', 'u1');

		expect(liked).toBe(true);
		// The original bug used the computed db column name (`comment_id`) here,
		// which `.values()` silently accepts and never persists correctly.
		expect(valuesCall).toEqual({ commentId: 'c1', userId: 'u1' });
	});

	it('inserts a post like keyed by postId', async () => {
		let valuesCall: unknown;
		dbMock.delete.mockReturnValue(makeChain([]));
		dbMock.insert.mockReturnValue(
			makeChain(undefined, (method, args) => {
				if (method === 'values') valuesCall = args[0];
			})
		);

		const liked = await LikeRepository.toggle('post', 'p1', 'u1');

		expect(liked).toBe(true);
		expect(valuesCall).toEqual({ postId: 'p1', userId: 'u1' });
	});

	it('removes an existing like instead of inserting a duplicate', async () => {
		dbMock.delete.mockReturnValue(makeChain([{ id: 'like-1' }]));

		const liked = await LikeRepository.toggle('comment', 'c1', 'u1');

		expect(liked).toBe(false);
		expect(dbMock.insert).not.toHaveBeenCalled();
	});
});

describe('LikeRepository.countForTargets', () => {
	it('returns an empty map without querying for an empty id list', async () => {
		const result = await LikeRepository.countForTargets('comment', []);

		expect(result).toEqual(new Map());
		expect(dbMock.select).not.toHaveBeenCalled();
	});

	it('maps grouped counts by target id', async () => {
		dbMock.select.mockReturnValue(
			makeChain([
				{ targetId: 'c1', count: 3 },
				{ targetId: 'c2', count: 1 }
			])
		);

		const result = await LikeRepository.countForTargets('comment', ['c1', 'c2']);

		expect(result).toEqual(
			new Map([
				['c1', 3],
				['c2', 1]
			])
		);
	});
});

describe('LikeRepository.likedByUser', () => {
	it('returns an empty set without querying for an empty id list', async () => {
		const result = await LikeRepository.likedByUser('u1', 'comment', []);

		expect(result).toEqual(new Set());
		expect(dbMock.select).not.toHaveBeenCalled();
	});

	it('returns the subset of ids the user has liked', async () => {
		dbMock.select.mockReturnValue(makeChain([{ targetId: 'c1' }]));

		const result = await LikeRepository.likedByUser('u1', 'comment', ['c1', 'c2']);

		expect(result).toEqual(new Set(['c1']));
	});
});
