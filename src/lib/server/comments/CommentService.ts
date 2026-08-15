import { CommentRepository, type CommentTargetType } from '$lib/db/services/CommentRepository';
import {
	containsUrl,
	resolveTargetOwnerUserId,
	MAX_MESSAGE_LENGTH
} from '$lib/server/messages/policy';
import { resolveTargetAccess } from '$lib/server/messages/access';
import { LikeService } from '$lib/server/likes';

import type { CommentDTO } from '$lib/messages/types';

export type { CommentDTO };

type WriteRejection = 'empty' | 'too_long' | 'links_not_allowed';

type CreateResult =
	| { ok: true; comment: CommentDTO }
	| { ok: false; reason: WriteRejection | 'invalid_target' };

type EditResult =
	| { ok: true; comment: CommentDTO }
	| { ok: false; reason: WriteRejection | 'not_found' | 'forbidden' };

type DeleteResult = { ok: true } | { ok: false; reason: 'not_found' | 'forbidden' };

// Targets that accept a content comment. Extend this to add a new commentable type.
const COMMENT_TARGET_TYPES: CommentTargetType[] = ['post', 'track'];

function displayName(name: string | null, username: string | null): string {
	return name ?? username ?? 'Listener';
}

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

		// One grouped count + one membership query for the whole page, not per row.
		const likes = await LikeService.summaryFor(
			'comment',
			rows.map((r) => r.id),
			input.viewerUserId
		);

		return rows.map((r) => ({
			id: r.id,
			body: r.body,
			createdAt: r.createdAt.toISOString(),
			author: {
				id: r.authorId,
				name: displayName(r.authorName, r.authorUsername),
				avatar: r.authorAvatar
			},
			editedAt: r.editedAt?.toISOString() ?? null,
			isArtist: !!ownerUserId && r.authorId === ownerUserId,
			// The artist-owner may remove a comment (moderation) but never rewrite it —
			// only the author edits their own words.
			canDelete:
				!!input.viewerUserId &&
				(input.viewerUserId === r.authorId || input.viewerUserId === ownerUserId),
			canEdit: !!input.viewerUserId && input.viewerUserId === r.authorId,
			likeCount: likes.get(r.id)?.likeCount ?? 0,
			likedByViewer: likes.get(r.id)?.likedByViewer ?? false
		}));
	}

	static async create(input: {
		targetType: CommentTargetType;
		targetId: string;
		authorId: string;
		authorName: string | null;
		authorUsername: string | null;
		authorAvatar: string | null;
		body: string;
	}): Promise<CreateResult> {
		if (!COMMENT_TARGET_TYPES.includes(input.targetType)) {
			return { ok: false, reason: 'invalid_target' };
		}
		const body = input.body.trim();
		if (!body) return { ok: false, reason: 'empty' };
		if (body.length > MAX_MESSAGE_LENGTH) return { ok: false, reason: 'too_long' };

		// Reject anything the author can't actually reach: a missing target (no FK
		// backs the polymorphic `target_id`, so an orphan row would never be reaped),
		// an unpublished draft, or gated content they aren't entitled to.
		const access = await resolveTargetAccess(input.targetType, input.targetId, input.authorId);
		if (!access.ok) return { ok: false, reason: 'invalid_target' };
		const ownerUserId = access.ownerUserId;

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
				// The author is the logged-in creator; use their real session identity
				// rather than a placeholder so the optimistic-rendered comment is correct.
				author: {
					id: input.authorId,
					name: displayName(input.authorName, input.authorUsername),
					avatar: input.authorAvatar
				},
				editedAt: null,
				isArtist: input.authorId === ownerUserId,
				canDelete: true,
				canEdit: true,
				// A brand-new comment has no likes yet.
				likeCount: 0,
				likedByViewer: false
			}
		};
	}

	/**
	 * Edit a comment's body. Author-only by design: the artist-owner may delete a
	 * comment (moderation) but must never be able to rewrite someone else's words.
	 * The link rule is re-applied, since an edit can introduce a URL.
	 */
	static async edit(input: {
		commentId: string;
		userId: string;
		authorName: string | null;
		authorUsername: string | null;
		authorAvatar: string | null;
		body: string;
	}): Promise<EditResult> {
		const row = await CommentRepository.getById(input.commentId);
		if (!row || row.deletedAt) return { ok: false, reason: 'not_found' };
		if (row.authorId !== input.userId) return { ok: false, reason: 'forbidden' };

		const body = input.body.trim();
		if (!body) return { ok: false, reason: 'empty' };
		if (body.length > MAX_MESSAGE_LENGTH) return { ok: false, reason: 'too_long' };

		const ownerUserId = await resolveTargetOwnerUserId(
			row.targetType as CommentTargetType,
			row.targetId
		);
		if (containsUrl(body) && input.userId !== ownerUserId) {
			return { ok: false, reason: 'links_not_allowed' };
		}

		const updated = await CommentRepository.updateBody(input.commentId, body);
		if (!updated) return { ok: false, reason: 'not_found' };

		// The caller swaps this DTO in for the edited row, so carry the real like
		// state — returning zeroes would wipe the count off screen.
		const likes = await LikeService.summaryFor('comment', [updated.id], input.userId);
		const like = likes.get(updated.id);

		return {
			ok: true,
			comment: {
				id: updated.id,
				body: updated.body,
				createdAt: updated.createdAt.toISOString(),
				editedAt: updated.editedAt?.toISOString() ?? null,
				// The editor is the author — use their session identity, same as create.
				author: {
					id: updated.authorId,
					name: displayName(input.authorName, input.authorUsername),
					avatar: input.authorAvatar
				},
				isArtist: updated.authorId === ownerUserId,
				canDelete: true,
				canEdit: true,
				likeCount: like?.likeCount ?? 0,
				likedByViewer: like?.likedByViewer ?? false
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
