import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchChatHistory, postChatMessage, deleteChatMessage } from './chat';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => vi.clearAllMocks());

describe('fetchChatHistory', () => {
	it('returns messages on success', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ messages: [{ id: 'm1' }] }) });
		const result = await fetchChatHistory('a1');
		expect(result).toEqual({ ok: true, messages: [{ id: 'm1' }] });
	});

	it('maps a not_subscribed error to copy', async () => {
		fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'not_subscribed' }) });
		const result = await fetchChatHistory('a1');
		expect(result).toEqual({ ok: false, error: 'Subscribe to join the conversation.' });
	});

	it('omits the before param on the initial page', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ messages: [] }) });
		await fetchChatHistory('a1');
		expect(fetchMock).toHaveBeenCalledWith('/api/chat?artistId=a1');
	});

	it('sends before as a cursor when paging further back', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ messages: [] }) });
		await fetchChatHistory('a1', '2026-08-18T00:00:00.000Z');
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/chat?artistId=a1&before=2026-08-18T00%3A00%3A00.000Z'
		);
	});
});

describe('postChatMessage', () => {
	it('posts to /api/chat and returns the created message', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ message: { id: 'm2' } }) });
		const result = await postChatMessage('a1', 'hello');

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/chat',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ artistId: 'a1', body: 'hello' })
			})
		);
		expect(result).toEqual({ ok: true, message: { id: 'm2' } });
	});
});

describe('deleteChatMessage', () => {
	it('deletes with the artistId as a query param', async () => {
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
		const result = await deleteChatMessage('a1', 'm2');

		expect(fetchMock).toHaveBeenCalledWith('/api/chat/m2?artistId=a1', { method: 'DELETE' });
		expect(result).toEqual({ ok: true });
	});
});
