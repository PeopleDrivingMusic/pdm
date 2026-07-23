import { describe, it, expect } from 'vitest';
import { canViewVisibility, lockReasonFor, sanitizeVisibility } from './ContentService';

describe('sanitizeVisibility', () => {
	it('keeps subscribers', () => expect(sanitizeVisibility('subscribers')).toBe('subscribers'));
	it('keeps public', () => expect(sanitizeVisibility('public')).toBe('public'));
	it('fails closed: legacy followers → subscribers', () =>
		expect(sanitizeVisibility('followers')).toBe('subscribers'));
	it('fails closed: legacy investors → subscribers', () =>
		expect(sanitizeVisibility('investors')).toBe('subscribers'));
	it('fails closed: unknown value → subscribers', () =>
		expect(sanitizeVisibility('garbage')).toBe('subscribers'));
});

describe('canViewVisibility', () => {
	it('owner sees subscribers content', () =>
		expect(canViewVisibility('subscribers', { isOwner: true })).toBe(true));
	it('subscriber sees subscribers content', () =>
		expect(canViewVisibility('subscribers', { isSubscriber: true })).toBe(true));
	it('non-subscriber cannot see subscribers content', () =>
		expect(canViewVisibility('subscribers', { isSubscriber: false })).toBe(false));
	it('anyone sees public content', () => expect(canViewVisibility('public', {})).toBe(true));
});

describe('lockReasonFor', () => {
	it('subscribers → subscribe prompt', () =>
		expect(lockReasonFor('subscribers')).toBe('Subscribe to unlock'));
	it('public → null', () => expect(lockReasonFor('public')).toBeNull());
});
