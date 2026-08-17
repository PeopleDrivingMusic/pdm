import { it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/entitlement', () => ({
	EntitlementService: { subscribe: vi.fn(), unsubscribe: vi.fn() }
}));

import { EntitlementService } from '$lib/server/entitlement';
import { POST, DELETE } from './+server';

const evt = (method: 'POST' | 'DELETE', user: any) => ({
	params: { id: 'a1' },
	locals: { user },
	request: new Request('http://localhost/api/artist/a1/subscription', {
		method,
		headers: { origin: 'http://localhost' }
	}),
	url: new URL('http://localhost/api/artist/a1/subscription')
});

beforeEach(() => vi.clearAllMocks());

it('POST 401 when not logged in', async () => {
	const res = await (POST as any)(evt('POST', null));
	expect(res.status).toBe(401);
	expect(EntitlementService.subscribe).not.toHaveBeenCalled();
});

it('POST subscribes the logged-in user', async () => {
	const res = await (POST as any)(evt('POST', { id: 'u1' }));
	expect(res.status).toBe(200);
	expect(EntitlementService.subscribe).toHaveBeenCalledWith('u1', 'a1');
});

it('DELETE unsubscribes the logged-in user', async () => {
	const res = await (DELETE as any)(evt('DELETE', { id: 'u1' }));
	expect(res.status).toBe(200);
	expect(EntitlementService.unsubscribe).toHaveBeenCalledWith('u1', 'a1');
});
