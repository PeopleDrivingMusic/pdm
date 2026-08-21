import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/chat', () => ({
	ChatService: { delete: vi.fn() }
}));

import { ChatService } from '$lib/server/chat';
import { DELETE } from './+server';

const ARTIST_ID = '11111111-1111-1111-1111-111111111111';
const MESSAGE_ID = '22222222-2222-2222-2222-222222222222';

function makeEvent(id: string, artistId: string, userId?: string) {
	const url = new URL('http://localhost/api/chat/x');
	url.searchParams.set('artistId', artistId);
	return {
		params: { id },
		url,
		request: { headers: new Headers({ origin: 'http://localhost' }) },
		locals: userId ? { user: { id: userId } } : {}
	} as any;
}

beforeEach(() => vi.clearAllMocks());

describe('DELETE /api/chat/[id]', () => {
	it('401s when logged out', async () => {
		const response = await DELETE(makeEvent(MESSAGE_ID, ARTIST_ID));
		expect(response.status).toBe(401);
	});

	it('400s on a malformed id', async () => {
		const response = await DELETE(makeEvent('nope', ARTIST_ID, 'u1'));
		expect(response.status).toBe(400);
	});

	it('400s on a malformed artistId', async () => {
		const response = await DELETE(makeEvent(MESSAGE_ID, 'nope', 'u1'));
		expect(response.status).toBe(400);
	});

	it('404s when the service reports not_found', async () => {
		(ChatService.delete as any).mockResolvedValue({ ok: false, reason: 'not_found' });
		const response = await DELETE(makeEvent(MESSAGE_ID, ARTIST_ID, 'u1'));
		expect(response.status).toBe(404);
	});

	it('403s when the service reports forbidden', async () => {
		(ChatService.delete as any).mockResolvedValue({ ok: false, reason: 'forbidden' });
		const response = await DELETE(makeEvent(MESSAGE_ID, ARTIST_ID, 'u1'));
		expect(response.status).toBe(403);
	});

	it('200s on success', async () => {
		(ChatService.delete as any).mockResolvedValue({ ok: true });
		const response = await DELETE(makeEvent(MESSAGE_ID, ARTIST_ID, 'u1'));
		expect(response.status).toBe(200);
	});
});
