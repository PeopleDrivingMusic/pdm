import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db', () => ({
	client: { notify: vi.fn().mockResolvedValue(undefined) }
}));

vi.mock('$lib/utils/logger', () => ({
	logger: { warn: vi.fn() }
}));

import { client } from '$lib/db';
import { logger } from '$lib/utils/logger';
import { publishChatMessage, maskChatEvent } from './broadcast';
import type { ChatMessagePublished } from './broadcast';

beforeEach(() => {
	vi.clearAllMocks();
});

describe('publishChatMessage', () => {
	it('notifies the artist-scoped channel with a JSON-encoded message event', () => {
		const message = {
			id: 'm1',
			body: 'hi',
			createdAt: '2026-08-18T00:00:00.000Z',
			author: { id: 'u1', name: 'Fan', avatar: null },
			isArtist: false,
			canDelete: true
		};

		publishChatMessage('artist-1', message);

		expect(client.notify).toHaveBeenCalledWith(
			'chat_room_artist-1',
			JSON.stringify({ kind: 'message', message })
		);
	});

	it('logs a warning when NOTIFY fails', async () => {
		const error = new Error('NOTIFY failed');
		(client.notify as any).mockRejectedValueOnce(error);

		const message = {
			id: 'm1',
			body: 'hi',
			createdAt: '2026-08-18T00:00:00.000Z',
			author: { id: 'u1', name: 'Fan', avatar: null },
			isArtist: false,
			canDelete: true
		};

		publishChatMessage('artist-1', message);

		// Give the promise time to resolve
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(logger.warn).toHaveBeenCalled();
	});
});

describe('maskChatEvent', () => {
	const event: ChatMessagePublished = {
		kind: 'message',
		message: {
			id: 'm1',
			body: 'real body text',
			createdAt: '2026-08-18T00:00:00.000Z',
			author: { id: 'u1', name: 'Real Fan', avatar: 'https://example.test/a.png' },
			isArtist: false,
			canDelete: true
		}
	};

	it('passes the real message through for a subscriber', () => {
		const frame = maskChatEvent(event, true);
		expect(frame).toEqual({ type: 'message', message: event.message });
	});

	it('replaces the body and author with a teaser for a non-subscriber', () => {
		const frame = maskChatEvent(event, false);
		expect(frame).toEqual({
			type: 'teaser',
			teaser: { id: 'm1', createdAt: '2026-08-18T00:00:00.000Z' }
		});
	});

	it('never leaks the real body onto a teaser frame', () => {
		const frame = maskChatEvent(event, false);
		expect(JSON.stringify(frame)).not.toContain('real body text');
		expect(JSON.stringify(frame)).not.toContain('Real Fan');
	});
});
