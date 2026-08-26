import { ChatRepository, type ChatMessageWithAuthor } from '$lib/db/services/ChatRepository';
import {
	containsUrl,
	resolveTargetOwnerUserId,
	MAX_MESSAGE_LENGTH
} from '$lib/server/messages/policy';
import { EntitlementService } from '$lib/server/entitlement';
import { publishChatMessage } from './broadcast';
import type { ChatDTO } from '$lib/messages/types';

export type { ChatDTO };

type WriteRejection = 'empty' | 'too_long' | 'links_not_allowed';

type ListResult = { ok: true; messages: ChatDTO[] } | { ok: false; reason: 'not_subscribed' };
type CreateResult =
	| { ok: true; message: ChatDTO }
	| { ok: false; reason: WriteRejection | 'not_subscribed' | 'unauthorized' };
type DeleteResult =
	| { ok: true }
	| { ok: false; reason: 'not_found' | 'forbidden' | 'unauthorized' };

function displayName(name: string | null, username: string | null): string {
	return name ?? username ?? 'Listener';
}

function toDTO(
	row: {
		id: string;
		body: string;
		createdAt: Date;
		authorId: string;
		authorName: string | null;
		authorUsername: string | null;
		authorAvatar: string | null;
	},
	ownerUserId: string | null,
	viewerUserId: string | null
): ChatDTO {
	return {
		id: row.id,
		body: row.body,
		createdAt: row.createdAt.toISOString(),
		author: {
			id: row.authorId,
			name: displayName(row.authorName, row.authorUsername),
			avatar: row.authorAvatar
		},
		isArtist: !!ownerUserId && row.authorId === ownerUserId,
		canDelete: !!viewerUserId && (viewerUserId === row.authorId || viewerUserId === ownerUserId)
	};
}

/**
 * Application boundary for the subscriber fan chat. Every operation here — read and
 * write — is gated by `EntitlementService.isSubscriberOf` OR by being the artist who
 * owns the room: the artist must always be able to read and post in their own fan
 * room regardless of subscription status (they can't subscribe to themselves).
 * Returns only DTOs — no Drizzle rows leak across this seam.
 */
export class ChatService {
	static async getMessages(input: {
		artistId: string;
		viewerUserId: string | null;
		before?: Date;
	}): Promise<ListResult> {
		const [isSubscriber, ownerUserId] = await Promise.all([
			EntitlementService.isSubscriberOf(input.viewerUserId, input.artistId),
			resolveTargetOwnerUserId('artist', input.artistId)
		]);
		const isOwner = !!input.viewerUserId && input.viewerUserId === ownerUserId;
		if (!isSubscriber && !isOwner) return { ok: false, reason: 'not_subscribed' };

		const rows = await ChatRepository.getMessages({
			artistId: input.artistId,
			before: input.before
		});

		return { ok: true, messages: rows.map((r) => toDTO(r, ownerUserId, input.viewerUserId)) };
	}

	static async create(input: {
		artistId: string;
		authorId: string | null;
		authorName: string | null;
		authorUsername: string | null;
		authorAvatar: string | null;
		body: string;
	}): Promise<CreateResult> {
		if (!input.authorId) return { ok: false, reason: 'unauthorized' };

		const [isSubscriber, ownerUserId] = await Promise.all([
			EntitlementService.isSubscriberOf(input.authorId, input.artistId),
			resolveTargetOwnerUserId('artist', input.artistId)
		]);
		const isOwner = input.authorId === ownerUserId;
		if (!isSubscriber && !isOwner) return { ok: false, reason: 'not_subscribed' };

		const body = input.body.trim();
		if (!body) return { ok: false, reason: 'empty' };
		if (body.length > MAX_MESSAGE_LENGTH) return { ok: false, reason: 'too_long' };

		if (containsUrl(body) && !isOwner) {
			return { ok: false, reason: 'links_not_allowed' };
		}

		const row: ChatMessageWithAuthor & { id: string } = {
			...(await ChatRepository.create({
				artistId: input.artistId,
				authorId: input.authorId,
				body
			})),
			authorName: input.authorName,
			authorUsername: input.authorUsername,
			authorAvatar: input.authorAvatar
		};
		const message = toDTO(row, ownerUserId, input.authorId);

		publishChatMessage(input.artistId, message);
		return { ok: true, message };
	}

	static async delete(input: {
		messageId: string;
		userId: string | null;
		artistId: string;
	}): Promise<DeleteResult> {
		if (!input.userId) return { ok: false, reason: 'unauthorized' };

		const row = await ChatRepository.getById(input.messageId);
		if (!row || row.deletedAt || row.artistId !== input.artistId) {
			return { ok: false, reason: 'not_found' };
		}

		const isAuthor = row.authorId === input.userId;
		if (!isAuthor) {
			const ownerUserId = await resolveTargetOwnerUserId('artist', row.artistId);
			if (input.userId !== ownerUserId) return { ok: false, reason: 'forbidden' };
		}
		await ChatRepository.softDelete(input.messageId);
		return { ok: true };
	}
}
