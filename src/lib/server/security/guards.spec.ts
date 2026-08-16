import { describe, it, expect } from 'vitest';
import { requireSameOrigin, requireUser, isGuardResponse } from './guards';

const evt = (over: any = {}) => ({
	request: new Request('http://localhost/api/x', {
		method: 'POST',
		headers: over.headers ?? { origin: 'http://localhost' }
	}),
	url: new URL('http://localhost/api/x'),
	locals: over.locals ?? {}
});

describe('requireSameOrigin', () => {
	it('returns null for a same-origin request', () => {
		expect(requireSameOrigin(evt())).toBeNull();
	});
	it('returns a 403 Response for a cross-origin request', () => {
		const res = requireSameOrigin(evt({ headers: { origin: 'http://evil.test' } }));
		expect(res).toBeInstanceOf(Response);
		expect((res as Response).status).toBe(403);
	});
});

describe('requireUser', () => {
	it('returns { userId } for a logged-in viewer', () => {
		expect(requireUser(evt({ locals: { user: { id: 'u1' } } }))).toEqual({ userId: 'u1' });
	});
	it('returns a 401 Response when not logged in', () => {
		const res = requireUser(evt({ locals: {} }));
		expect(res).toBeInstanceOf(Response);
		expect((res as Response).status).toBe(401);
	});
});

describe('isGuardResponse', () => {
	it('is true for a Response and false for a principal', () => {
		expect(isGuardResponse(new Response())).toBe(true);
		expect(isGuardResponse({ userId: 'u1' })).toBe(false);
	});
});

describe('error bodies are machine-readable codes', () => {
	it('answers a cross-origin request with a forbidden code', async () => {
		const res = requireSameOrigin(evt({ headers: { origin: 'http://evil.test' } })) as Response;
		expect(await res.json()).toEqual({ error: 'forbidden' });
	});

	it('answers an anonymous caller with an unauthorized code', async () => {
		const res = requireUser(evt({ locals: {} })) as Response;
		expect(await res.json()).toEqual({ error: 'unauthorized' });
	});
});
