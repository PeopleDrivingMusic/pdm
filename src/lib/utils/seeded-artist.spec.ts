import { describe, it, expect } from 'vitest';
import { isSeededUnclaimed } from './seeded-artist';

describe('isSeededUnclaimed', () => {
	it('is false for a native artist', () => {
		expect(isSeededUnclaimed({ origin: 'native', claimedAt: null })).toBe(false);
	});

	it('is true for an imported artist nobody has claimed', () => {
		expect(isSeededUnclaimed({ origin: 'audius', claimedAt: null })).toBe(true);
	});

	it('is false once the artist has claimed the page', () => {
		expect(isSeededUnclaimed({ origin: 'audius', claimedAt: new Date() })).toBe(false);
	});
});
