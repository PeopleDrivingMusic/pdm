import type {
	CommentDTO,
	CommentErrorCode,
	CommentTargetType,
	LikeTargetType
} from '$lib/messages/types';
import { errorMessage, GENERIC_ERROR } from './errors';
import { notificationStore } from '$lib/stores/notification.svelte';

export type { CommentTargetType };

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; error: string };

export type CommentsResult = Ok<{ comments: CommentDTO[] }> | Fail;
export type CommentResult = Ok<{ comment: CommentDTO }> | Fail;
export type DeleteResult = { ok: true } | Fail;

/**
 * Copy for every code the comment endpoints can return. `satisfies` makes this
 * exhaustive: add a `CommentErrorCode` without copy here and the build fails,
 * so a new server error can't silently degrade to the generic message.
 */
const COMMENT_ERROR_COPY = {
	empty: 'Write something first.',
	too_long: 'That comment is too long.',
	links_not_allowed: 'Links are not allowed here — only the artist can post links.',
	invalid_target: 'That post is no longer available.',
	not_found: 'That comment is no longer available.',
	forbidden: "You can't do that.",
	rate_limited: "You're posting too fast — try again in a minute.",
	invalid_request: 'That comment could not be sent.',
	invalid_comment_id: 'That comment is no longer available.',
	unauthorized: 'Sign in to join the conversation.'
} satisfies Record<CommentErrorCode, string>;

/** Public read: list the comments on a post or track. */
export async function fetchComments(
	targetType: CommentTargetType,
	targetId: string
): Promise<CommentsResult> {
	try {
		const query = new URLSearchParams({ targetType, targetId });
		const response = await fetch(`/api/comments?${query}`, { method: 'GET' });
		if (!response.ok) {
			return {
				ok: false,
				error: await errorMessage(response, COMMENT_ERROR_COPY, 'Could not load comments.')
			};
		}
		const body = await response.json();
		// Don't trust the shape: a malformed 200 should read as "no comments", not crash.
		return { ok: true, comments: Array.isArray(body?.comments) ? body.comments : [] };
	} catch {
		return { ok: false, error: 'Could not load comments.' };
	}
}

/** Post a new comment as the logged-in user. */
export async function createComment(
	targetType: CommentTargetType,
	targetId: string,
	body: string
): Promise<CommentResult> {
	try {
		const response = await fetch('/api/comments', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ targetType, targetId, body })
		});
		if (!response.ok) {
			return {
				ok: false,
				error: await errorMessage(response, COMMENT_ERROR_COPY, 'Could not post your comment.')
			};
		}
		const payload = await response.json();
		if (!payload?.comment?.id) return { ok: false, error: GENERIC_ERROR };
		return { ok: true, comment: payload.comment };
	} catch {
		return { ok: false, error: 'Could not post your comment.' };
	}
}

/** Edit one of your own comments. */
export async function editComment(commentId: string, body: string): Promise<CommentResult> {
	try {
		const response = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ body })
		});
		if (!response.ok) {
			return {
				ok: false,
				error: await errorMessage(response, COMMENT_ERROR_COPY, 'Could not save your edit.')
			};
		}
		const payload = await response.json();
		if (!payload?.comment?.id) return { ok: false, error: GENERIC_ERROR };
		return { ok: true, comment: payload.comment };
	} catch {
		return { ok: false, error: 'Could not save your edit.' };
	}
}

/** Delete a comment you authored, or any comment on content you own. */
export async function deleteComment(commentId: string): Promise<DeleteResult> {
	try {
		const response = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
			method: 'DELETE'
		});
		if (!response.ok) {
			return {
				ok: false,
				error: await errorMessage(response, COMMENT_ERROR_COPY, 'Could not delete that comment.')
			};
		}
		return { ok: true };
	} catch {
		return { ok: false, error: 'Could not delete that comment.' };
	}
}

export type LikeResult = Ok<{ liked: boolean; likeCount: number }> | Fail;
export type LikeState = { liked: boolean; likeCount: number };

/** Toggle the current user's like on a comment or a post. */
export async function toggleLike(
	targetType: LikeTargetType,
	targetId: string
): Promise<LikeResult> {
	try {
		const response = await fetch('/api/likes', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ targetType, targetId })
		});
		if (!response.ok) {
			return {
				ok: false,
				error: await errorMessage(response, COMMENT_ERROR_COPY, 'Could not register your like.')
			};
		}
		const payload = await response.json();
		return { ok: true, liked: Boolean(payload?.liked), likeCount: Number(payload?.likeCount ?? 0) };
	} catch {
		return { ok: false, error: 'Could not register your like.' };
	}
}

/**
 * Every like affordance (comment, post, and eventually track/video) follows
 * the same shape: flip immediately so the tap feels instant, then reconcile
 * with the server's real count, or roll back to the exact pre-click state
 * and surface the failure — the same toast used across the app. `apply` is
 * the only thing that differs per caller (a single override vs. one row in a
 * list), so it stays a plain callback rather than owned state here.
 */
export async function toggleLikeOptimistic(
	targetType: LikeTargetType,
	targetId: string,
	current: LikeState,
	apply: (next: LikeState) => void
): Promise<void> {
	const before = current;
	const liked = !current.liked;
	const likeCount = Math.max(0, current.likeCount + (liked ? 1 : -1));
	apply({ liked, likeCount });

	const result = await toggleLike(targetType, targetId);
	if (!result.ok) {
		apply(before);
		notificationStore.error(result.error);
		return;
	}
	apply({ liked: result.liked, likeCount: result.likeCount });
}
