import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '$lib/utils/logger';
import { LogEventPublisher } from './LogEventPublisher';

vi.mock('$lib/utils/logger', () => ({
	logger: { info: vi.fn() }
}));

describe('LogEventPublisher', () => {
	beforeEach(() => vi.clearAllMocks());

	it('logs the domain event via logger.info', async () => {
		const publisher = new LogEventPublisher();
		const event = {
			type: 'track.uploaded' as const,
			trackId: 't1',
			artistId: 'a1',
			occurredAt: '2026-06-30T00:00:00.000Z'
		};
		await publisher.publish(event);
		expect(logger.info).toHaveBeenCalledWith(
			'domain.event',
			expect.objectContaining({ component: 'events', metadata: { event } })
		);
	});
});
