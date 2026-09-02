import { describe, it, expect, vi, beforeEach } from 'vitest';

const m = vi.hoisted(() => {
	const onConflictDoUpdate = vi.fn((_config: { set: Record<string, unknown> }) =>
		Promise.resolve()
	);
	const values = vi.fn((_row: Record<string, unknown>) => ({ onConflictDoUpdate }));
	const insert = vi.fn((_table: unknown) => ({ values }));
	return { onConflictDoUpdate, values, insert };
});

vi.mock('$lib/db', () => ({
	db: { insert: m.insert },
	withDbLogging: vi.fn(async (_name: string, fn: () => unknown) => fn())
}));

import { SubscriptionService } from './SubscriptionService';

beforeEach(() => vi.clearAllMocks());

describe('SubscriptionService.subscribe — kind', () => {
	it('defaults to a paid subscription when no kind is given', async () => {
		await SubscriptionService.subscribe('u1', 'a1');
		expect(m.values).toHaveBeenCalledWith(expect.objectContaining({ kind: 'paid' }));
	});

	// Money-shaped: a pre-claim row must say so on the write path itself, not rely on a
	// caller remembering to flag it — the comment on `subscriptions.kind` in the schema
	// says these rows "must never reach revenue reporting."
	it('records a pre-claim free subscription when the caller says so', async () => {
		await SubscriptionService.subscribe('u1', 'a1', 'pre_claim_free');
		expect(m.values).toHaveBeenCalledWith(expect.objectContaining({ kind: 'pre_claim_free' }));
	});

	it('reconciles kind on re-subscribe too, not only on first insert', async () => {
		await SubscriptionService.subscribe('u1', 'a1', 'paid');
		const conflict = m.onConflictDoUpdate.mock.calls[0][0];
		expect(conflict.set.kind).toBe('paid');
	});
});
