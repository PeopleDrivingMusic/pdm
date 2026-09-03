import { describe, it, expect } from 'vitest';
import { httpsUrl, bounded, externalIdOrNull, socialHandle, LIMITS } from './sanitize';

describe('httpsUrl', () => {
	it('keeps an ordinary https URL', () => {
		expect(httpsUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
	});

	it.each([
		['javascript:', 'javascript:alert(1)'],
		['data:', 'data:text/html;base64,PHNjcmlwdD4='],
		['plain http', 'http://cdn.example.com/a.jpg'],
		['protocol-relative', '//evil.example.com/a.jpg'],
		['relative path', '/a.jpg'],
		['not a URL at all', 'deadmau5'],
		['empty', '']
	])('rejects %s', (_label, value) => {
		expect(httpsUrl(value)).toBeNull();
	});

	it('rejects a URL longer than the column can hold', () => {
		expect(httpsUrl(`https://e.com/${'a'.repeat(LIMITS.url)}`)).toBeNull();
	});

	it('passes null and undefined straight through', () => {
		expect(httpsUrl(null)).toBeNull();
		expect(httpsUrl(undefined)).toBeNull();
	});
});

describe('bounded', () => {
	it('trims and keeps a normal string', () => {
		expect(bounded('  deadmau5  ', 100)).toBe('deadmau5');
	});

	it('truncates rather than letting Postgres raise 22001', () => {
		// A display string is worth truncating: refusing the whole import over a long bio
		// is worse than showing a shortened one, and an unhandled 22001 is worst of all.
		expect(bounded('a'.repeat(250), 100)).toHaveLength(100);
	});

	it('returns null for empty or whitespace-only input', () => {
		expect(bounded('   ', 100)).toBeNull();
		expect(bounded('', 100)).toBeNull();
		expect(bounded(null, 100)).toBeNull();
	});

	it('strips control characters that would corrupt a rendered page', () => {
		expect(bounded('dead\u0000mau5', 100)).toBe('deadmau5');
	});
});

describe('externalIdOrNull', () => {
	it('keeps a real Audius hashid', () => {
		expect(externalIdOrNull('LKdlD')).toBe('LKdlD');
	});

	it('never truncates — a shortened id is a different, wrong record', () => {
		expect(externalIdOrNull('a'.repeat(LIMITS.externalId + 1))).toBeNull();
	});

	it.each([
		['a slash', 'LKdlD/../7YmNr'],
		['a query', 'LKdlD?x=1'],
		['a fragment', 'LKdlD#x'],
		['whitespace', 'LK dlD'],
		['empty', '']
	])('rejects an id containing %s', (_label, value) => {
		expect(externalIdOrNull(value)).toBeNull();
	});
});

describe('socialHandle', () => {
	it('keeps a bare handle', () => {
		expect(socialHandle('deadmau5')).toBe('deadmau5');
	});

	it('strips a leading @', () => {
		expect(socialHandle('@deadmau5')).toBe('deadmau5');
	});

	it.each([
		['a full URL', 'https://evil.example.com/phish'],
		['a scheme', 'javascript:alert(1)'],
		['a path', 'deadmau5/../../evil'],
		['whitespace', 'dead mau5'],
		['empty', '']
	])('rejects %s, which would become an open-redirect link', (_label, value) => {
		expect(socialHandle(value)).toBeNull();
	});

	it('rejects an over-long handle rather than truncating into someone else', () => {
		expect(socialHandle('a'.repeat(LIMITS.socialHandle + 1))).toBeNull();
	});
});
