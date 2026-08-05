import { CommentRepository, type CommentTargetType } from '$lib/db/services/CommentRepository';
import {
	containsUrl,
	resolveTargetOwnerUserId,
	MAX_MESSAGE_LENGTH
} from '$lib/server/messages/policy';

export interface CommentDTO {
	id: string;
	body: string;
	createdAt: string;
	author: { id: string; name: string; avatar: string | null };
	isArtist: boolean;
	canDelete: boolean;
}

type CreateResult =
	| { ok: true; comment: CommentDTO }
	| { ok: false; reason: 'empty' | 'too_long' | 'links_not_allowed' | 'invalid_target' };

type DeleteResult = { ok: true } | { ok: false; reason: 'not_found' | 'forbidden' };

/**
 * Application boundary for content comments. Free to write (no entitlement),
 * public to read. Returns only DTOs — no Drizzle rows leak across this seam.
 */
export class CommentService {
	static async listForTarget(input: {
		targetType: CommentTargetType;
		targetId: string;
		viewerUserId: string | null;
	}): Promise<CommentDTO[]> {
		const [rows, ownerUserId] = await Promise.all([
			CommentRepository.listForTarget({ targetType: input.targetType, targetId: input.targetId }),
			resolveTargetOwnerUserId(input.targetType, input.targetId)
		]);
		return rows.map((r) => ({
			id: r.id,
			body: r.body,
			createdAt: r.createdAt.toISOString(),
			author: {
				id: r.authorId,
				name: r.authorName ?? r.authorUsername ?? 'Listener',
				avatar: r.authorAvatar
			},
			isArtist: !!ownerUserId && r.authorId === ownerUserId,
			canDelete:
				!!input.viewerUserId &&
				(input.viewerUserId === r.authorId || input.viewerUserId === ownerUserId)
		}));
	}

	static async create(input: {
		targetType: CommentTargetType;
		targetId: string;
		authorId: string;
		body: string;
	}): Promise<CreateResult> {
		if (input.targetType !== 'post' && input.targetType !== 'track') {
			return { ok: false, reason: 'invalid_target' };
		}
		const body = input.body.trim();
		if (!body) return { ok: false, reason: 'empty' };
		if (body.length > MAX_MESSAGE_LENGTH) return { ok: false, reason: 'too_long' };

		const ownerUserId = await resolveTargetOwnerUserId(input.targetType, input.targetId);
		if (containsUrl(body) && input.authorId !== ownerUserId) {
			return { ok: false, reason: 'links_not_allowed' };
		}

		const row = await CommentRepository.create({
			targetType: input.targetType,
			targetId: input.targetId,
			authorId: input.authorId,
			body
		});
		return {
			ok: true,
			comment: {
				id: row.id,
				body: row.body,
				createdAt: row.createdAt.toISOString(),
				author: { id: row.authorId, name: 'You', avatar: null },
				isArtist: input.authorId === ownerUserId,
				canDelete: true
			}
		};
	}

	static async delete(input: { commentId: string; userId: string }): Promise<DeleteResult> {
		const row = await CommentRepository.getById(input.commentId);
		if (!row || row.deletedAt) return { ok: false, reason: 'not_found' };

		const isAuthor = row.authorId === input.userId;
		if (!isAuthor) {
			const ownerUserId = await resolveTargetOwnerUserId(
				row.targetType as CommentTargetType,
				row.targetId
			);
			if (input.userId !== ownerUserId) return { ok: false, reason: 'forbidden' };
		}
		await CommentRepository.softDelete(input.commentId);
		return { ok: true };
	}

	static async countsForPosts(postIds: string[]): Promise<Map<string, number>> {
		return CommentRepository.countForTargets('post', postIds);
	}
}
