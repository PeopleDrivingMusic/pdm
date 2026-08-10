import type { CommentDTO } from '$lib/server/comments';

export type CommentTargetType = 'post' | 'track';

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; error: string };

export type CommentsResult = Ok<{ comments: CommentDTO[] }> | Fail;
export type CommentResult = Ok<{ comment: CommentDTO }> | Fail;
export type DeleteResult = { ok: true } | Fail;

const GENERIC = 'Something went wrong. Please try again.';

/** Map a server error code to copy a listener can act on. */
function messageFor(code: unknown, fallback = GENERIC): string {
	switch (code) {
		case 'links_not_allowed':
			return 'Links are not allowed here — only the artist can post links.';
		case 'rate_limited':
			return "You're posting too fast — try again in a minute.";
		case 'empty':
			return 'Write something first.';
		case 'too_long':
			return 'That comment is too long.';
		case 'not_found':
			return 'That comment is no longer available.';
		case 'forbidden':
			return "You can't do that.";
		default:
			return fallback;
	}
}

async function readError(response: Response, fallback = GENERIC): Promise<string> {
	try {
		const body = await response.json();
		return messageFor(body?.error, fallback);
	} catch {
		return fallback;
	}
}

const jsonRequest = (method: 'POST' | 'PUT', body: unknown): RequestInit => ({
	method,
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify(body)
});

/** Public read: list the comments on a post or track. */
export async function fetchComments(
	targetType: CommentTargetType,
	targetId: string
): Promise<CommentsResult> {
	try {
		const response = await fetch(`/api/comments?targetType=${targetType}&targetId=${targetId}`, {
			method: 'GET'
		});
		if (!response.ok)
			return { ok: false, error: await readError(response, 'Could not load comments.') };
		const body = await response.json();
		return { ok: true, comments: body.comments ?? [] };
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
		const response = await fetch(
			'/api/comments',
			jsonRequest('POST', { targetType, targetId, body })
		);
		if (!response.ok)
			return { ok: false, error: await readError(response, 'Could not post your comment.') };
		const payload = await response.json();
		return { ok: true, comment: payload.comment };
	} catch {
		return { ok: false, error: 'Could not post your comment.' };
	}
}

/** Edit one of your own comments. */
export async function editComment(commentId: string, body: string): Promise<CommentResult> {
	try {
		const response = await fetch(`/api/comments/${commentId}`, jsonRequest('PUT', { body }));
		if (!response.ok)
			return { ok: false, error: await readError(response, 'Could not save your edit.') };
		const payload = await response.json();
		return { ok: true, comment: payload.comment };
	} catch {
		return { ok: false, error: 'Could not save your edit.' };
	}
}

/** Delete a comment you authored, or any comment on content you own. */
export async function deleteComment(commentId: string): Promise<DeleteResult> {
	try {
		const response = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
		if (!response.ok)
			return { ok: false, error: await readError(response, 'Could not delete that comment.') };
		return { ok: true };
	} catch {
		return { ok: false, error: 'Could not delete that comment.' };
	}
}
