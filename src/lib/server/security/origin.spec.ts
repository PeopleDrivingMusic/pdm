import { describe, it, expect } from 'vitest';
import { isSameOrigin } from './origin';

function evt(headers: Record<string, string>, origin = 'https://app.test') {
	return { request: { headers: new Headers(headers) }, url: new URL(origin) } as any;
}

describe('isSameOrigin', () => {
	it('accepts a matching origin header', () => {
		expect(isSameOrigin(evt({ origin: 'https://app.test' }))).toBe(true);
	});
	it('rejects a mismatched origin header', () => {
		expect(isSameOrigin(evt({ origin: 'https://evil.test' }))).toBe(false);
	});
	it('accepts a missing origin when Sec-Fetch-Site is same-origin', () => {
		expect(isSameOrigin(evt({ 'sec-fetch-site': 'same-origin' }))).toBe(true);
	});
	it('accepts a missing origin when Sec-Fetch-Site is same-site', () => {
		expect(isSameOrigin(evt({ 'sec-fetch-site': 'same-site' }))).toBe(true);
	});
	it('rejects a missing origin with no same-origin signal', () => {
		expect(isSameOrigin(evt({}))).toBe(false);
	});
});
