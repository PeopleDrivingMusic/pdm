import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted for the same reason as CatalogImportRepository.spec.ts: a bare module-level
// const would still be in its temporal dead zone when the `$lib/db` mock factory runs.
const m = vi.hoisted(() => {
	const returning = vi.fn(async () => [{ id: 'req-1' }]);
	const onConflictDoNothing = vi.fn((_config: { target: unknown[] }) => ({ returning }));
	const values = vi.fn((_row: Record<string, unknown>) => ({ onConflictDoNothing }));
	const insert = vi.fn((_table: unknown) => ({ values }));
	return { returning, onConflictDoNothing, values, insert };
});

vi.mock('$lib/db', () => ({
	db: { insert: m.insert },
	withDbLogging: vi.fn(async (_name: string, fn: () => unknown) => fn())
}));

import { ClaimRequestService } from './ClaimRequestService';

beforeEach(() => {
	vi.clearAllMocks();
	m.returning.mockResolvedValue([{ id: 'req-1' }]);
});

describe('ClaimRequestService.create', () => {
	it('writes a claim request tying the artist to the requesting user', async () => {
		await ClaimRequestService.create({ artistId: 'a1', userId: 'u1', message: 'This is me' });
		expect(m.values).toHaveBeenCalledWith({ artistId: 'a1', userId: 'u1', message: 'This is me' });
	});

	it('reports ok on the first request', async () => {
		await expect(
			ClaimRequestService.create({ artistId: 'a1', userId: 'u1', message: null })
		).resolves.toEqual({ ok: true });
	});

	// The unique (artist, user) index makes this INSERT a no-op instead of a duplicate
	// row — `returning` comes back empty, which is how the service tells the two cases
	// apart without a SELECT-then-INSERT race.
	it('refuses a duplicate request from the same user for the same artist', async () => {
		m.returning.mockResolvedValue([]);
		await expect(
			ClaimRequestService.create({ artistId: 'a1', userId: 'u1', message: null })
		).resolves.toEqual({ ok: false, reason: 'already_requested' });
	});

	it('keys the conflict on the (artist, user) pair, not the artist alone', async () => {
		await ClaimRequestService.create({ artistId: 'a1', userId: 'u1', message: null });
		const config = m.onConflictDoNothing.mock.calls[0][0];
		expect(config.target).toHaveLength(2);
	});
});
