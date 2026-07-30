import { describe, it, expect } from 'vitest';
import {
	normalizeContentVisibility,
	normalizeContentStatus,
	CONTENT_VISIBILITY_VALUES,
	CONTENT_STATUS_VALUES
} from './content-visibility';

describe('normalizeContentVisibility (fail closed)', () => {
	it('keeps explicit public', () => expect(normalizeContentVisibility('public')).toBe('public'));
	it('keeps subscribers', () =>
		expect(normalizeContentVisibility('subscribers')).toBe('subscribers'));
	it('collapses legacy followers to subscribers', () =>
		expect(normalizeContentVisibility('followers')).toBe('subscribers'));
	it('collapses legacy investors to subscribers', () =>
		expect(normalizeContentVisibility('investors')).toBe('subscribers'));
	it('collapses unknown to subscribers', () =>
		expect(normalizeContentVisibility('garbage')).toBe('subscribers'));
	it('collapses non-string (null/undefined) to subscribers', () => {
		expect(normalizeContentVisibility(null)).toBe('subscribers');
		expect(normalizeContentVisibility(undefined)).toBe('subscribers');
	});
});

describe('normalizeContentStatus', () => {
	it('keeps each valid status', () => {
		for (const status of CONTENT_STATUS_VALUES) {
			expect(normalizeContentStatus(status)).toBe(status);
		}
	});
	it('falls back to draft by default', () =>
		expect(normalizeContentStatus('garbage')).toBe('draft'));
	it('honors a custom fallback', () =>
		expect(normalizeContentStatus(null, 'published')).toBe('published'));
});

describe('constants', () => {
	it('expose the two-tier visibility vocabulary', () =>
		expect([...CONTENT_VISIBILITY_VALUES]).toEqual(['public', 'subscribers']));
});
