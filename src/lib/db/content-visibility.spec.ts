import { describe, it, expect } from 'vitest';
import {
	normalizeContentVisibility,
	normalizeContentStatus,
	CONTENT_VISIBILITY_VALUES,
	CONTENT_STATUS_VALUES
} from './content-visibility';

describe('normalizeContentVisibility (public default)', () => {
	it('keeps explicit subscribers', () =>
		expect(normalizeContentVisibility('subscribers')).toBe('subscribers'));
	it('keeps public', () => expect(normalizeContentVisibility('public')).toBe('public'));
	it('defaults unknown values to public', () =>
		expect(normalizeContentVisibility('garbage')).toBe('public'));
	it('defaults null/undefined to public', () => {
		expect(normalizeContentVisibility(null)).toBe('public');
		expect(normalizeContentVisibility(undefined)).toBe('public');
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
