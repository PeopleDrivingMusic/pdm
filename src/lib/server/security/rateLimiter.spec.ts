import { describe, it, expect } from 'vitest';
import { createRateLimiter } from './rateLimiter';

describe('createRateLimiter', () => {
	it('allows up to the limit then blocks', () => {
		const rl = createRateLimiter({ limit: 2, windowMs: 1000 });
		expect(rl.check('artist-1', 0)).toBe(true);
		expect(rl.check('artist-1', 100)).toBe(true);
		expect(rl.check('artist-1', 200)).toBe(false);
	});
	it('resets after the window elapses', () => {
		const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
		expect(rl.check('a', 0)).toBe(true);
		expect(rl.check('a', 500)).toBe(false);
		expect(rl.check('a', 1500)).toBe(true);
	});
	it('tracks keys independently', () => {
		const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
		expect(rl.check('a', 0)).toBe(true);
		expect(rl.check('b', 0)).toBe(true);
	});
	it('evicts expired windows so the map does not grow unbounded', () => {
		const rl = createRateLimiter({ limit: 1, windowMs: 1000, pruneThreshold: 10 });
		for (let i = 0; i < 50; i += 1) rl.check(`key-${i}`, 0);
		// A later check past the window triggers a prune of expired keys.
		rl.check('trigger', 5000);
		expect(rl.size()).toBeLessThan(50);
	});
});
