import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/db/services/ChatRepository', () => ({
	ChatRepository: {
		create: vi.fn(),
		getById: vi.fn(),
		getMessages: vi.fn(),
		softDelete: vi.fn()
	}
}));
vi.mock('$lib/server/messages/policy', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/messages/policy')>()),
	resolveTargetOwnerUserId: vi.fn()
}));
vi.mock('$lib/server/entitlement', () => ({
	EntitlementService: { isSubscriberOf: vi.fn() }
}));
vi.mock('./broadcast', () => ({
	publishChatMessage: vi.fn()
}));

import { ChatRepository } from '$lib/db/services/ChatRepository';
import { resolveTargetOwnerUserId } from '$lib/server/messages/policy';
import { EntitlementService } from '$lib/server/entitlement';
import { publishChatMessage } from './broadcast';
import { ChatService } from './ChatService';

beforeEach(() => {
	vi.clearAllMocks();
	(resolveTargetOwnerUserId as any).mockResolvedValue('owner1');
});

describe('ChatService.getMessages', () => {
	it('refuses a non-subscriber without querying the repository', async () => {
		(EntitlementService.isSubscriberOf as any).mockResolvedValue(false);

		const result = await ChatService.getMessages({ artistId: 'a1', viewerUserId: 'u2' });

		expect(result).toEqual({ ok: false, reason: 'not_subscribed' });
		expect(ChatRepository.getMessages).not.toHaveBeenCalled();
	});

	it('returns DTOs for a subscriber, flagging the artist-authored row', async () => {
		(EntitlementService.isSubscriberOf as any).mockResolvedValue(true);
		(ChatRepository.getMessages as any).mockResolvedValue([
			{
				id: 'm1',
				body: 'hey fans',
				createdAt: new Date('2026-08-18T00:00:00Z'),
				authorId: 'owner1',
				authorName: 'The Artist',
				authorUsername: 'artist1',
				authorAvatar: null
			}
		]);

		const result = await ChatService.getMessages({ artistId: 'a1', viewerUserId: 'u2' });

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.messages[0].isArtist).toBe(true);
			expect(result.messages[0].body).toBe('hey fans');
		}
	});

	it('lets the artist owner read their own room even without a subscription', async () => {
		(EntitlementService.isSubscriberOf as any).mockResolvedValue(false);
		(ChatRepository.getMessages as any).mockResolvedValue([]);

		const result = await ChatService.getMessages({ artistId: 'a1', viewerUserId: 'owner1' });

		expect(result).toEqual({ ok: true, messages: [] });
	});
});

describe('ChatService.create', () => {
	beforeEach(() => {
		(EntitlementService.isSubscriberOf as any).mockResolvedValue(true);
		(ChatRepository.create as any).mockResolvedValue({
			id: 'm2',
			body: 'nice show',
			createdAt: new Date('2026-08-18T00:00:00Z'),
			authorId: 'u2'
		});
	});

	it('refuses when authorId is null', async () => {
		const result = await ChatService.create({
			artistId: 'a1',
			authorId: null,
			authorName: 'Fan',
			authorUsername: 'fan2',
			authorAvatar: null,
			body: 'hi'
		});

		expect(result).toEqual({ ok: false, reason: 'unauthorized' });
		expect(ChatRepository.create).not.toHaveBeenCalled();
	});

	it('refuses a non-subscriber and never touches the repository', async () => {
		(EntitlementService.isSubscriberOf as any).mockResolvedValue(false);

		const result = await ChatService.create({
			artistId: 'a1',
			authorId: 'u2',
			authorName: 'Fan',
			authorUsername: 'fan2',
			authorAvatar: null,
			body: 'hi'
		});

		expect(result).toEqual({ ok: false, reason: 'not_subscribed' });
		expect(ChatRepository.create).not.toHaveBeenCalled();
	});

	it('rejects an empty body', async () => {
		const result = await ChatService.create({
			artistId: 'a1',
			authorId: 'u2',
			authorName: 'Fan',
			authorUsername: 'fan2',
			authorAvatar: null,
			body: '   '
		});
		expect(result).toEqual({ ok: false, reason: 'empty' });
	});

	it('rejects a body that exceeds MAX_MESSAGE_LENGTH', async () => {
		const longBody = 'x'.repeat(10001); // MAX_MESSAGE_LENGTH is 10000
		const result = await ChatService.create({
			artistId: 'a1',
			authorId: 'u2',
			authorName: 'Fan',
			authorUsername: 'fan2',
			authorAvatar: null,
			body: longBody
		});
		expect(result).toEqual({ ok: false, reason: 'too_long' });
	});

	it('rejects a link from a non-owner', async () => {
		const result = await ChatService.create({
			artistId: 'a1',
			authorId: 'u2',
			authorName: 'Fan',
			authorUsername: 'fan2',
			authorAvatar: null,
			body: 'check out scam.com'
		});
		expect(result).toEqual({ ok: false, reason: 'links_not_allowed' });
	});

	it('publishes the created message to the room on success', async () => {
		const result = await ChatService.create({
			artistId: 'a1',
			authorId: 'u2',
			authorName: 'Fan',
			authorUsername: 'fan2',
			authorAvatar: null,
			body: 'nice show'
		});

		expect(result.ok).toBe(true);
		expect(publishChatMessage).toHaveBeenCalledWith(
			'a1',
			expect.objectContaining({ id: 'm2', body: 'nice show' })
		);
	});

	it('lets the artist owner post in their own room even without a subscription', async () => {
		(EntitlementService.isSubscriberOf as any).mockResolvedValue(false);
		(ChatRepository.create as any).mockResolvedValue({
			id: 'm3',
			body: 'thanks for coming out!',
			createdAt: new Date('2026-08-18T00:00:00Z'),
			authorId: 'owner1'
		});

		const result = await ChatService.create({
			artistId: 'a1',
			authorId: 'owner1',
			authorName: 'The Artist',
			authorUsername: 'artist1',
			authorAvatar: null,
			body: 'thanks for coming out!'
		});

		expect(result).toEqual({
			ok: true,
			message: expect.objectContaining({ id: 'm3', isArtist: true })
		});
	});

	it('lets the artist owner post a link even without a subscription', async () => {
		(EntitlementService.isSubscriberOf as any).mockResolvedValue(false);
		(ChatRepository.create as any).mockResolvedValue({
			id: 'm4',
			body: 'tickets at example.com',
			createdAt: new Date('2026-08-18T00:00:00Z'),
			authorId: 'owner1'
		});

		const result = await ChatService.create({
			artistId: 'a1',
			authorId: 'owner1',
			authorName: 'The Artist',
			authorUsername: 'artist1',
			authorAvatar: null,
			body: 'tickets at example.com'
		});

		expect(result.ok).toBe(true);
	});

	it('uses fallback "Listener" when author has no name or username', async () => {
		const result = await ChatService.create({
			artistId: 'a1',
			authorId: 'u2',
			authorName: null,
			authorUsername: null,
			authorAvatar: null,
			body: 'nice show'
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.message.author.name).toBe('Listener');
		}
	});
});

describe('ChatService.delete', () => {
	it('refuses when userId is null', async () => {
		const result = await ChatService.delete({ messageId: 'm1', userId: null, artistId: 'a1' });

		expect(result).toEqual({ ok: false, reason: 'unauthorized' });
		expect(ChatRepository.getById).not.toHaveBeenCalled();
	});

	it('lets the author delete their own message', async () => {
		(ChatRepository.getById as any).mockResolvedValue({
			id: 'm1',
			artistId: 'a1',
			authorId: 'u2',
			deletedAt: null
		});

		const result = await ChatService.delete({ messageId: 'm1', userId: 'u2', artistId: 'a1' });

		expect(result).toEqual({ ok: true });
		expect(ChatRepository.softDelete).toHaveBeenCalledWith('m1');
	});

	it('lets the artist-owner delete any message in their room', async () => {
		(ChatRepository.getById as any).mockResolvedValue({
			id: 'm1',
			artistId: 'a1',
			authorId: 'u2',
			deletedAt: null
		});

		const result = await ChatService.delete({ messageId: 'm1', userId: 'owner1', artistId: 'a1' });

		expect(result).toEqual({ ok: true });
	});

	it('forbids a third party', async () => {
		(ChatRepository.getById as any).mockResolvedValue({
			id: 'm1',
			artistId: 'a1',
			authorId: 'u2',
			deletedAt: null
		});

		const result = await ChatService.delete({ messageId: 'm1', userId: 'u3', artistId: 'a1' });

		expect(result).toEqual({ ok: false, reason: 'forbidden' });
		expect(ChatRepository.softDelete).not.toHaveBeenCalled();
	});

	it('returns not_found for a message from a different artist room', async () => {
		(ChatRepository.getById as any).mockResolvedValue({
			id: 'm1',
			artistId: 'a-other',
			authorId: 'u2',
			deletedAt: null
		});

		const result = await ChatService.delete({ messageId: 'm1', userId: 'u2', artistId: 'a1' });

		expect(result).toEqual({ ok: false, reason: 'not_found' });
	});

	it('returns not_found when the message does not exist at all', async () => {
		(ChatRepository.getById as any).mockResolvedValue(undefined);

		const result = await ChatService.delete({ messageId: 'missing', userId: 'u2', artistId: 'a1' });

		expect(result).toEqual({ ok: false, reason: 'not_found' });
		expect(ChatRepository.softDelete).not.toHaveBeenCalled();
	});

	it('returns not_found for a message that was already deleted', async () => {
		(ChatRepository.getById as any).mockResolvedValue({
			id: 'm1',
			artistId: 'a1',
			authorId: 'u2',
			deletedAt: new Date('2026-08-17T00:00:00Z')
		});

		const result = await ChatService.delete({ messageId: 'm1', userId: 'u2', artistId: 'a1' });

		expect(result).toEqual({ ok: false, reason: 'not_found' });
		expect(ChatRepository.softDelete).not.toHaveBeenCalled();
	});
});
