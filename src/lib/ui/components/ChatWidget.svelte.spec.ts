import { page } from '@vitest/browser/context';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ChatWidget from './ChatWidget.svelte';

vi.mock('$lib/remote/chat.remote', () => ({
	getChatRoom: () => {
		async function* empty() {
			yield { type: 'presence', onlineCount: 3, artistOnline: true };
		}
		return empty();
	}
}));
vi.mock('$lib/client/chat', () => ({
	fetchChatHistory: vi.fn().mockResolvedValue({ ok: true, messages: [] }),
	postChatMessage: vi.fn(),
	deleteChatMessage: vi.fn()
}));

describe('ChatWidget — guest (non-subscriber)', () => {
	it('shows the online count and artist-in-room status without any message body', async () => {
		render(ChatWidget, {
			artistId: 'a1',
			isSubscriber: false,
			isArtist: false
		});

		await expect.element(page.getByText(/3/)).toBeInTheDocument();
		await expect.element(page.getByPlaceholder(/message/i)).not.toBeInTheDocument();
		// The locked panel is informational only — never a subscribe button itself.
		await expect.element(page.getByText(/subscribe to unlock/i)).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /subscribe/i })).not.toBeInTheDocument();
	});
});

describe('ChatWidget — artist owner (not a subscriber of themselves)', () => {
	it('still shows the composer, since the artist owns the room', async () => {
		render(ChatWidget, {
			artistId: 'a1',
			isSubscriber: false,
			isArtist: true
		});

		await expect.element(page.getByPlaceholder(/message the room/i)).toBeInTheDocument();
	});
});
