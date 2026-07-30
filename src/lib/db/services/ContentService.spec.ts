import { describe, it, expect } from 'vitest';
import { canViewVisibility } from './ContentService';

// Visibility normalization (fail-closed) is now owned by content-visibility.ts and
// covered by content-visibility.spec.ts. Lock-teaser copy is now client-side.

describe('canViewVisibility', () => {
	it('owner sees subscribers content', () =>
		expect(canViewVisibility('subscribers', { isOwner: true })).toBe(true));
	it('subscriber sees subscribers content', () =>
		expect(canViewVisibility('subscribers', { isSubscriber: true })).toBe(true));
	it('non-subscriber cannot see subscribers content', () =>
		expect(canViewVisibility('subscribers', { isSubscriber: false })).toBe(false));
	it('anyone sees public content', () => expect(canViewVisibility('public', {})).toBe(true));
});
