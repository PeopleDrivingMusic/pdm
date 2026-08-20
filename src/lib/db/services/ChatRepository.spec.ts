import { describe, it, expect, vi, beforeEach } from 'vitest';

/** Same thenable chain stand-in as `LikeRepository.spec.ts`, extended with the
 *  extra chain methods `ChatRepository` calls (`innerJoin`, `orderBy`, `limit`, `set`). */
function makeChain(result: unknown, onCall?: (method: string, args: unknown[]) => void) {
	const chain: Record<string, unknown> = {
		then: (resolve: (value: unknown) => void) => resolve(result)
	};
	for (const method of [
		'where',
		'from',
		'innerJoin',
		'orderBy',
		'limit',
		'set',
		'returning',
		'values'
	]) {
		chain[method] = (...args: unknown[]) => {
			onCall?.(method, args);
			return chain;
		};
	}
	return chain;
}

const dbMock = vi.hoisted(() => ({
	insert: vi.fn(),
	select: vi.fn(),
	update: vi.fn()
}));

vi.mock('../index', () => ({
	db: dbMock,
	withDbLogging: (_name: string, fn: () => unknown) => fn()
}));

import { ChatRepository } from './ChatRepository';

beforeEach(() => vi.clearAllMocks());

describe('ChatRepository.create', () => {
	it('inserts a chat message keyed by the TS property name, not the db column name', async () => {
		let valuesCall: unknown;
		dbMock.insert.mockReturnValue(
			makeChain([{ id: 'm1' }], (method, args) => {
				if (method === 'values') valuesCall = args[0];
			})
		);

		await ChatRepository.create({ artistId: 'a1', authorId: 'u1', body: 'hi' });

		expect(valuesCall).toEqual({ artistId: 'a1', authorId: 'u1', body: 'hi' });
	});
});

describe('ChatRepository.getMessages', () => {
	it('returns the rows resolved by the select chain', async () => {
		dbMock.select.mockReturnValue(makeChain([{ id: 'm1', body: 'hey' }]));

		const rows = await ChatRepository.getMessages({ artistId: 'a1' });

		expect(rows).toEqual([{ id: 'm1', body: 'hey' }]);
	});

	it('clamps limit into the [1, 100] range', async () => {
		let limitArg: unknown;
		dbMock.select.mockReturnValue(
			makeChain([], (method, args) => {
				if (method === 'limit') limitArg = args[0];
			})
		);

		await ChatRepository.getMessages({ artistId: 'a1', limit: 500 });
		expect(limitArg).toBe(100);

		await ChatRepository.getMessages({ artistId: 'a1', limit: -5 });
		expect(limitArg).toBe(1);
	});
});

describe('ChatRepository.softDelete', () => {
	it('sets deletedAt via the update chain', async () => {
		let setArg: unknown;
		dbMock.update.mockReturnValue(
			makeChain(undefined, (method, args) => {
				if (method === 'set') setArg = args[0];
			})
		);

		await ChatRepository.softDelete('m1');

		expect((setArg as { deletedAt: unknown })?.deletedAt).toBeInstanceOf(Date);
	});
});
