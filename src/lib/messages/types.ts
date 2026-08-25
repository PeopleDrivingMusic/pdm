/**
 * Shared message contracts. Deliberately dependency-free so both the server
 * (repository, boundary, endpoints) and the browser can import it — the client
 * must never reach into `$lib/server/*`, even for a type.
 */

/** Content a comment can hang off. Extend this to add a commentable type. */
export type CommentTargetType = 'post' | 'track';

/** Things a listener can like. Each has its own table with an FK cascade. */
export type LikeTargetType = 'comment' | 'post';

/** Like state for one target, as the UI renders it. */
export interface LikeSummary {
	likeCount: number;
	likedByViewer: boolean;
}

/** Author identity as rendered — resolved per read, never stored on the row. */
export interface MessageAuthor {
	id: string;
	name: string;
	avatar: string | null;
}

/**
 * A user-authored message as the UI consumes it. Comments use it today; the
 * subscriber fan chat reuses the same shape.
 */
export interface MessageDTO {
	id: string;
	body: string;
	createdAt: string;
	editedAt: string | null;
	author: MessageAuthor;
	isArtist: boolean;
	canDelete: boolean;
	canEdit: boolean;
	likeCount: number;
	likedByViewer: boolean;
}

export type CommentDTO = MessageDTO;

/**
 * Every machine-readable code the comment endpoints can return. Listing them
 * here (rather than accepting `unknown`) means adding a new one forces the
 * client's copy map to handle it — the compiler catches the omission.
 */
export type CommentErrorCode =
	| 'empty'
	| 'too_long'
	| 'links_not_allowed'
	| 'invalid_target'
	| 'not_found'
	| 'forbidden'
	| 'rate_limited'
	| 'invalid_request'
	| 'invalid_comment_id'
	| 'unauthorized';

/** Every machine-readable code `POST /api/likes` can return. */
export type LikeErrorCode =
	| 'invalid_target'
	| 'forbidden'
	| 'rate_limited'
	| 'invalid_request'
	| 'unauthorized';

/** Author identity as a chat message renders it. Same shape as `MessageAuthor`,
 *  kept separate so chat and comments can diverge without cross-coupling. */
export interface ChatAuthor {
	id: string;
	name: string;
	avatar: string | null;
}

/** Messages per page for chat history (initial load and each older-page fetch).
 *  Shared by the repository (query limit) and the client (to infer whether a
 *  fetch returned a full page, i.e. there may be more history to load). */
export const CHAT_HISTORY_PAGE_SIZE = 50;

/** A subscriber-visible chat message. No edit, no likes — unlike comments. */
export interface ChatDTO {
	id: string;
	body: string;
	createdAt: string;
	author: ChatAuthor;
	isArtist: boolean;
	canDelete: boolean;
}

/** What a non-subscriber sees instead of a real message: real cadence, no content. */
export interface ChatTeaser {
	id: string;
	createdAt: string;
}

/** One frame streamed by `getChatRoom`. `presence` frames go to every viewer
 *  unmasked; `message`/`teaser` are the masked/unmasked split of the same event. */
export type ChatFrame =
	| { type: 'message'; message: ChatDTO }
	| { type: 'teaser'; teaser: ChatTeaser }
	| { type: 'presence'; onlineCount: number; artistOnline: boolean };

export type ChatErrorCode =
	| 'empty'
	| 'too_long'
	| 'links_not_allowed'
	| 'not_subscribed'
	| 'not_found'
	| 'forbidden'
	| 'invalid_request'
	| 'unauthorized';
