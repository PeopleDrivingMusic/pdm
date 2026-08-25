import type { ChatDTO, ChatErrorCode } from '$lib/messages/types';
import { errorMessage, GENERIC_ERROR } from './errors';

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; error: string };

export type ChatMessagesResult = Ok<{ messages: ChatDTO[] }> | Fail;
export type ChatMessageResult = Ok<{ message: ChatDTO }> | Fail;
export type ChatDeleteResult = { ok: true } | Fail;

const CHAT_ERROR_COPY = {
	empty: 'Write something first.',
	too_long: 'That message is too long.',
	links_not_allowed: 'Links are not allowed here — only the artist can post links.',
	not_subscribed: 'Subscribe to join the conversation.',
	not_found: 'That message is no longer available.',
	forbidden: "You can't do that.",
	invalid_request: 'That message could not be sent.',
	unauthorized: 'Sign in to join the conversation.'
} satisfies Record<ChatErrorCode, string>;

/**
 * `before` is the oldest currently-loaded message's `createdAt` (ISO string) —
 * pass it to page further back into history. Omit it for the initial (most
 * recent) page.
 */
export async function fetchChatHistory(
	artistId: string,
	before?: string
): Promise<ChatMessagesResult> {
	try {
		const params = new URLSearchParams({ artistId });
		if (before) params.set('before', before);
		const response = await fetch(`/api/chat?${params}`);
		if (!response.ok) {
			return {
				ok: false,
				error: await errorMessage(response, CHAT_ERROR_COPY, 'Could not load chat.')
			};
		}
		const body = await response.json();
		return { ok: true, messages: Array.isArray(body?.messages) ? body.messages : [] };
	} catch {
		return { ok: false, error: 'Could not load chat.' };
	}
}

export async function postChatMessage(artistId: string, body: string): Promise<ChatMessageResult> {
	try {
		const response = await fetch('/api/chat', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ artistId, body })
		});
		if (!response.ok) {
			return {
				ok: false,
				error: await errorMessage(response, CHAT_ERROR_COPY, 'Could not send your message.')
			};
		}
		const payload = await response.json();
		if (!payload?.message?.id) return { ok: false, error: GENERIC_ERROR };
		return { ok: true, message: payload.message };
	} catch {
		return { ok: false, error: 'Could not send your message.' };
	}
}

export async function deleteChatMessage(
	artistId: string,
	messageId: string
): Promise<ChatDeleteResult> {
	try {
		const response = await fetch(`/api/chat/${messageId}?artistId=${artistId}`, {
			method: 'DELETE'
		});
		if (!response.ok) {
			return {
				ok: false,
				error: await errorMessage(response, CHAT_ERROR_COPY, 'Could not delete that message.')
			};
		}
		return { ok: true };
	} catch {
		return { ok: false, error: 'Could not delete that message.' };
	}
}
