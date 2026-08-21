import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/chat', () => ({
	ChatService: { getMessages: vi.fn(), create: vi.fn() }
}));
vi.mock('$lib/server/security/guards', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/security/guards')>())
}));

import { ChatService } from '$lib/server/chat';
import { GET, POST } from './+server';

const ARTIST_ID = '11111111-1111-1111-1111-111111111111';

function makeGetEvent(searchParams: Record<string, string>, userId?: string) {
	const url = new URL('http://localhost/api/chat');
	for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
	return { url, locals: { user: userId ? { id: userId } : undefined } } as any;
}

beforeEach(() => vi.clearAllMocks());

describe('GET /api/chat', () => {
	it('400s when artistId is missing', async () => {
		const response = await GET(makeGetEvent({}));
		expect(response.status).toBe(400);
	});

	it('400s on a malformed artistId', async () => {
		const response = await GET(makeGetEvent({ artistId: 'not-a-uuid' }));
		expect(response.status).toBe(400);
	});

	it('403s when the service refuses a non-subscriber', async () => {
		(ChatService.getMessages as any).mockResolvedValue({ ok: false, reason: 'not_subscribed' });
		const response = await GET(makeGetEvent({ artistId: ARTIST_ID }));
		expect(response.status).toBe(403);
	});

	it('200s with messages for a subscriber', async () => {
		(ChatService.getMessages as any).mockResolvedValue({ ok: true, messages: [{ id: 'm1' }] });
		const response = await GET(makeGetEvent({ artistId: ARTIST_ID }, 'u1'));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ messages: [{ id: 'm1' }] });
	});
});

function makePostEvent(body: unknown, userId?: string) {
	return {
		request: {
			json: async () => body,
			headers: new Headers({ origin: 'http://localhost' })
		},
		url: new URL('http://localhost/api/chat'),
		locals: userId
			? { user: { id: userId, displayName: 'Fan', username: 'fan1', avatarUrl: null } }
			: {}
	} as any;
}

describe('POST /api/chat', () => {
	it('401s when logged out', async () => {
		const response = await POST(makePostEvent({ artistId: ARTIST_ID, body: 'hi' }));
		expect(response.status).toBe(401);
	});

	it('400s on a malformed artistId', async () => {
		const response = await POST(makePostEvent({ artistId: 'nope', body: 'hi' }, 'u1'));
		expect(response.status).toBe(400);
	});

	it('400s when artistId is missing', async () => {
		const response = await POST(makePostEvent({ body: 'hi' }, 'u1'));
		expect(response.status).toBe(400);
	});

	it('400s when body is missing', async () => {
		const response = await POST(makePostEvent({ artistId: ARTIST_ID }, 'u1'));
		expect(response.status).toBe(400);
	});

	it('400s when body is not a string', async () => {
		const response = await POST(makePostEvent({ artistId: ARTIST_ID, body: 123 }, 'u1'));
		expect(response.status).toBe(400);
	});

	it('400s when JSON is malformed', async () => {
		const event = {
			request: {
				json: async () => {
					throw new Error('Invalid JSON');
				},
				headers: new Headers({ origin: 'http://localhost' })
			},
			url: new URL('http://localhost/api/chat'),
			locals: { user: { id: 'u1', displayName: 'Fan', username: 'fan1', avatarUrl: null } }
		} as any;
		const response = await POST(event);
		expect(response.status).toBe(400);
	});

	it('403s when the service refuses a non-subscriber', async () => {
		(ChatService.create as any).mockResolvedValue({ ok: false, reason: 'not_subscribed' });
		const response = await POST(makePostEvent({ artistId: ARTIST_ID, body: 'hi' }, 'u1'));
		expect(response.status).toBe(403);
	});

	it('400s when the service refuses for other reason', async () => {
		(ChatService.create as any).mockResolvedValue({ ok: false, reason: 'bad_input' });
		const response = await POST(makePostEvent({ artistId: ARTIST_ID, body: 'hi' }, 'u1'));
		expect(response.status).toBe(400);
	});

	it('201s with the created message on success', async () => {
		(ChatService.create as any).mockResolvedValue({ ok: true, message: { id: 'm1' } });
		const response = await POST(makePostEvent({ artistId: ARTIST_ID, body: 'hi' }, 'u1'));
		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({ message: { id: 'm1' } });
	});
});
