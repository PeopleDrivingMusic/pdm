/**
 * Shared message contracts. Deliberately dependency-free so both the server
 * (repository, boundary, endpoints) and the browser can import it — the client
 * must never reach into `$lib/server/*`, even for a type.
 */

/** Content a comment can hang off. Extend this to add a commentable type. */
export type CommentTargetType = 'post' | 'track';

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
	| 'invalid_comment_id';
