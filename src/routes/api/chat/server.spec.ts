import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/chat', () => ({
	ChatService: { getMessages: vi.fn(), create: vi.fn() }
}));
vi.mock('$lib/server/security/guards');

import { ChatService } from '$lib/server/chat';
import { requireSameOrigin, requireUser, isGuardResponse } from '$lib/server/security/guards';
import { chatRoomWriteLimiter, chatGlobalWriteLimiter } from '$lib/server/chat/rateLimits';
import { GET, POST } from './+server';

const ARTIST_ID = '11111111-1111-1111-1111-111111111111';

function makeGetEvent(searchParams: Record<string, string>, userId?: string) {
	const url = new URL('http://localhost/api/chat');
	for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
	return { url, locals: { user: userId ? { id: userId } : undefined } } as any;
}

beforeEach(() => {
	vi.clearAllMocks();
	(requireSameOrigin as any).mockReturnValue(undefined);
	(requireUser as any).mockReturnValue({ userId: 'u1' });
	(isGuardResponse as any).mockReturnValue(false);
	chatRoomWriteLimiter.reset();
	chatGlobalWriteLimiter.reset();
});

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

	it('200s with empty messages list for non-subscriber with valid artistId', async () => {
		(ChatService.getMessages as any).mockResolvedValue({ ok: true, messages: [] });
		const response = await GET(makeGetEvent({ artistId: ARTIST_ID }));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ messages: [] });
	});

	it('passes no cursor to the service when `before` is absent', async () => {
		(ChatService.getMessages as any).mockResolvedValue({ ok: true, messages: [] });
		await GET(makeGetEvent({ artistId: ARTIST_ID }, 'u1'));
		expect(ChatService.getMessages).toHaveBeenCalledWith(
			expect.objectContaining({ before: undefined })
		);
	});

	it('parses `before` into a Date cursor and passes it to the service', async () => {
		(ChatService.getMessages as any).mockResolvedValue({ ok: true, messages: [] });
		await GET(makeGetEvent({ artistId: ARTIST_ID, before: '2026-08-18T00:00:00.000Z' }, 'u1'));
		expect(ChatService.getMessages).toHaveBeenCalledWith(
			expect.objectContaining({ before: new Date('2026-08-18T00:00:00.000Z') })
		);
	});

	it('400s when `before` is not a parseable date', async () => {
		const response = await GET(makeGetEvent({ artistId: ARTIST_ID, before: 'not-a-date' }, 'u1'));
		expect(response.status).toBe(400);
		expect(ChatService.getMessages).not.toHaveBeenCalled();
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
	it('403s when origin check fails', async () => {
		(requireSameOrigin as any).mockReturnValue(
			new Response(JSON.stringify({ error: 'invalid_origin' }), { status: 403 })
		);
		const response = await POST(makePostEvent({ artistId: ARTIST_ID, body: 'hi' }, 'u1'));
		expect(response.status).toBe(403);
	});

	it('401s when logged out', async () => {
		(requireUser as any).mockReturnValue(
			new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
		);
		(isGuardResponse as any).mockReturnValue(true);
		const response = await POST(makePostEvent({ artistId: ARTIST_ID, body: 'hi' }, 'u1'));
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

	it('400s when body is not a string (number)', async () => {
		const response = await POST(makePostEvent({ artistId: ARTIST_ID, body: 123 }, 'u1'));
		expect(response.status).toBe(400);
	});

	it('400s when artistId is null but body is string', async () => {
		const event = {
			request: {
				json: async () => ({ artistId: null, body: 'hi' }),
				headers: new Headers({ origin: 'http://localhost' })
			},
			url: new URL('http://localhost/api/chat'),
			locals: { user: { id: 'u1', displayName: 'Fan', username: 'fan1', avatarUrl: null } }
		} as any;
		const response = await POST(event);
		expect(response.status).toBe(400);
	});

	it('400s when both artistId and body are invalid', async () => {
		const response = await POST(makePostEvent({ artistId: 'nope', body: 123 }, 'u1'));
		expect(response.status).toBe(400);
	});

	it('400s when request is missing', async () => {
		const event = {
			request: {
				json: async () => null,
				headers: new Headers({ origin: 'http://localhost' })
			},
			url: new URL('http://localhost/api/chat'),
			locals: { user: { id: 'u1', displayName: 'Fan', username: 'fan1', avatarUrl: null } }
		} as any;
		const response = await POST(event);
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

	it('creates message when payload is valid and passes all guards', async () => {
		(ChatService.create as any).mockResolvedValue({
			ok: true,
			message: { id: 'm2', body: 'test' }
		});
		const event = {
			request: {
				json: async () => ({ artistId: ARTIST_ID, body: 'test message' }),
				headers: new Headers({ origin: 'http://localhost' })
			},
			url: new URL('http://localhost/api/chat'),
			locals: {
				user: { id: 'u1', displayName: 'Test User', username: 'testuser', avatarUrl: null }
			}
		} as any;
		const response = await POST(event);
		expect(response.status).toBe(201);
	});

	it('201s and passes through null displayName/username with avatarUrl', async () => {
		(ChatService.create as any).mockResolvedValue({ ok: true, message: { id: 'm3' } });
		const event = {
			request: {
				json: async () => ({ artistId: ARTIST_ID, body: 'anon message' }),
				headers: new Headers({ origin: 'http://localhost' })
			},
			url: new URL('http://localhost/api/chat'),
			locals: {
				user: {
					id: 'u1',
					displayName: null,
					username: null,
					avatarUrl: 'https://example.test/a.png'
				}
			}
		} as any;
		const response = await POST(event);
		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({ message: { id: 'm3' } });
	});
});

const OTHER_ARTIST_ID = '22222222-2222-2222-2222-222222222222';
const THIRD_ARTIST_ID = '33333333-3333-3333-3333-333333333333';
const FOURTH_ARTIST_ID = '44444444-4444-4444-4444-444444444444';

// Seeded pages multiply the number of rooms one account can write into, so a per-room
// allowance alone stops being a limit. Both limiters must pass.
describe('POST /api/chat rate limiting', () => {
	beforeEach(() => {
		(ChatService.create as any).mockResolvedValue({ ok: true, message: { id: 'm1' } });
	});

	it('429s once one room takes more than its share', async () => {
		for (let i = 0; i < 10; i++) {
			const ok = await POST(makePostEvent({ artistId: ARTIST_ID, body: 'hi' }, 'u1'));
			expect(ok.status).toBe(201);
		}
		const blocked = await POST(makePostEvent({ artistId: ARTIST_ID, body: 'hi' }, 'u1'));
		expect(blocked.status).toBe(429);
	});

	it('does not write when the limiter refuses', async () => {
		for (let i = 0; i < 10; i++)
			await POST(makePostEvent({ artistId: ARTIST_ID, body: 'hi' }, 'u1'));
		(ChatService.create as any).mockClear();
		await POST(makePostEvent({ artistId: ARTIST_ID, body: 'hi' }, 'u1'));
		expect(ChatService.create).not.toHaveBeenCalled();
	});

	it('429s a spammer spreading the same volume across rooms', async () => {
		// 10 in one room is within that room's allowance, and so is 10 in the next; the
		// global limiter is the only thing that sees the total.
		for (let i = 0; i < 10; i++)
			await POST(makePostEvent({ artistId: ARTIST_ID, body: 'hi' }, 'u1'));
		for (let i = 0; i < 10; i++)
			await POST(makePostEvent({ artistId: OTHER_ARTIST_ID, body: 'hi' }, 'u1'));
		for (let i = 0; i < 10; i++)
			await POST(makePostEvent({ artistId: THIRD_ARTIST_ID, body: 'hi' }, 'u1'));

		const blocked = await POST(makePostEvent({ artistId: FOURTH_ARTIST_ID, body: 'hi' }, 'u1'));
		expect(blocked.status).toBe(429);
	});

	it('leaves another user unthrottled', async () => {
		for (let i = 0; i < 11; i++)
			await POST(makePostEvent({ artistId: ARTIST_ID, body: 'hi' }, 'u1'));
		(requireUser as any).mockReturnValue({ userId: 'u2' });
		const other = await POST(makePostEvent({ artistId: ARTIST_ID, body: 'hi' }, 'u2'));
		expect(other.status).toBe(201);
	});

	it('meters before spending a service call on an invalid room', async () => {
		// The limiter keys on the artistId, so it can only run after the payload parses.
		const bad = await POST(makePostEvent({ artistId: 'nope', body: 'hi' }, 'u1'));
		expect(bad.status).toBe(400);
	});
});
