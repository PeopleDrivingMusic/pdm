import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/utils/logger', () => ({ logger: { debug: vi.fn(), error: vi.fn() } }));
vi.mock('$lib/utils/metrics', () => ({ MetricsCollector: { recordR2Error: vi.fn() } }));

import { logger } from '$lib/utils/logger';
import { MetricsCollector } from '$lib/utils/metrics';
import { withMediaLogging } from './logging';

beforeEach(() => vi.clearAllMocks());

describe('withMediaLogging', () => {
	it('returns the value and logs success', async () => {
		const result = await withMediaLogging('headObject', async () => 42);
		expect(result).toBe(42);
		expect(logger.debug).toHaveBeenCalled();
	});
	it('records an R2 error and rethrows on failure', async () => {
		await expect(
			withMediaLogging('headObject', async () => {
				throw new Error('boom');
			})
		).rejects.toThrow('boom');
		expect(MetricsCollector.recordR2Error).toHaveBeenCalledWith('headObject');
		expect(logger.error).toHaveBeenCalled();
	});
});
