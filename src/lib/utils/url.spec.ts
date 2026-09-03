import { describe, it, expect } from 'vitest';
import { isHttpsUrl, URL_MAX_LENGTH } from './url';

describe('isHttpsUrl', () => {
	it('accepts an https URL', () => {
		expect(isHttpsUrl('https://example.com')).toBe(true);
	});

	it('rejects http', () => {
		expect(isHttpsUrl('http://example.com')).toBe(false);
	});

	it('rejects a javascript: URL', () => {
		expect(isHttpsUrl('javascript:alert(1)')).toBe(false);
	});

	it('rejects null/undefined/non-string', () => {
		expect(isHttpsUrl(null)).toBe(false);
		expect(isHttpsUrl(undefined)).toBe(false);
	});

	it('rejects a value past the max length', () => {
		expect(isHttpsUrl(`https://e.com/${'a'.repeat(URL_MAX_LENGTH)}`)).toBe(false);
	});

	it('rejects an unparseable string', () => {
		expect(isHttpsUrl('not a url')).toBe(false);
	});
});
