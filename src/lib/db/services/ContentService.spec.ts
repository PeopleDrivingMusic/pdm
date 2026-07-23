import { describe, it, expect } from 'vitest';
import { canViewVisibility, lockReasonFor, sanitizeVisibility } from './ContentService';

describe('sanitizeVisibility', () => {
	it('keeps subscribers', () => expect(sanitizeVisibility('subscribers')).toBe('subscribers'));
	it('keeps public', () => expect(sanitizeVisibility('public')).toBe('public'));
	it('degrades legacy followers to public', () =>
		expect(sanitizeVisibility('followers')).toBe('public'));
	it('degrades legacy investors to public', () =>
		expect(sanitizeVisibility('investors')).toBe('public'));
	it('degrades unknown to public', () => expect(sanitizeVisibility('garbage')).toBe('public'));
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
