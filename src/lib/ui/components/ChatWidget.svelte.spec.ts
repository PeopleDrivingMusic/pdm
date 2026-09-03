import { page } from '@vitest/browser/context';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tick } from 'svelte';
import { render } from 'vitest-browser-svelte';
import ChatWidget from './ChatWidget.svelte';
import { CHAT_HISTORY_PAGE_SIZE, type ChatDTO } from '$lib/messages/types';

vi.mock('$lib/remote/chat.remote', () => ({
	getChatRoom: vi.fn(() => {
		async function* empty() {
			yield { type: 'presence', onlineCount: 3, artistOnline: true };
		}
		return empty();
	})
}));
vi.mock('$lib/client/chat', () => ({
	fetchChatHistory: vi.fn().mockResolvedValue({ ok: true, messages: [] }),
	postChatMessage: vi.fn(),
	deleteChatMessage: vi.fn()
}));

// Each test that needs page-specific responses overrides this via
// `mockImplementation`; reset back to the shared default afterward so tests
// that don't care about history still get a clean, empty room.
beforeEach(async () => {
	const { fetchChatHistory } = await import('$lib/client/chat');
	vi.mocked(fetchChatHistory).mockReset();
	vi.mocked(fetchChatHistory).mockResolvedValue({ ok: true, messages: [] });
});

describe('ChatWidget — guest (non-subscriber)', () => {
	it('never opens a live connection and shows only the static locked teaser', async () => {
		const { getChatRoom } = await import('$lib/remote/chat.remote');
		const getChatRoomSpy = vi.mocked(getChatRoom);

		render(ChatWidget, {
			artistId: 'a1',
			isSubscriber: false,
			isArtist: false
		});

		// No presence data ever arrives (no connection), so the online-count
		// cluster is omitted entirely rather than showing a stale "0 online".
		await expect.element(page.getByText(/online/i)).not.toBeInTheDocument();
		await expect.element(page.getByPlaceholder(/message/i)).not.toBeInTheDocument();
		// The locked panel is informational only — never a subscribe button itself.
		await expect.element(page.getByText(/subscribe to unlock/i)).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /subscribe/i })).not.toBeInTheDocument();
		expect(getChatRoomSpy).not.toHaveBeenCalled();
	});
});

describe('ChatWidget — seeded room, anonymous visitor', () => {
	it('opens a live connection and shows messages, but never the composer', async () => {
		const { fetchChatHistory } = await import('$lib/client/chat');
		const { getChatRoom } = await import('$lib/remote/chat.remote');
		vi.mocked(fetchChatHistory).mockResolvedValue({
			ok: true,
			messages: [chatMsg('s1', new Date(2026, 7, 20, 0, 0, 1).toISOString())]
		});
		const getChatRoomSpy = vi.mocked(getChatRoom);

		render(ChatWidget, {
			artistId: 'a1',
			isSubscriber: false,
			isArtist: false,
			isSeeded: true
		});

		// The server already opens this room to anonymous reads (S2a) — the widget's own
		// gate has to widen to match, or a real visitor never sees the open room it was
		// promised. `hasAccess` used to be the only gate for both fetching AND rendering;
		// `isSeeded` must clear it for reads without also clearing it for writes.
		await expect.element(page.getByText('msg s1')).toBeInTheDocument();
		expect(getChatRoomSpy).toHaveBeenCalledWith('a1');
		await expect.element(page.getByPlaceholder(/message/i)).not.toBeInTheDocument();
		await expect.element(page.getByText(/visible to everyone/i)).toBeInTheDocument();
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

function chatMsg(id: string, createdAt: string): ChatDTO {
	return {
		id,
		body: `msg ${id}`,
		createdAt,
		author: { id: 'u1', name: 'Fan', avatar: null },
		isArtist: false,
		canDelete: false
	};
}

describe('ChatWidget — history pagination', () => {
	it('loads older messages when scrolled near the top, and stops once a short page arrives', async () => {
		const { fetchChatHistory } = await import('$lib/client/chat');
		const fetchSpy = vi.mocked(fetchChatHistory);

		// Page 1 (initial): a full page, newest-first — same shape the server returns.
		const page1: ChatDTO[] = Array.from({ length: CHAT_HISTORY_PAGE_SIZE }, (_, i) =>
			chatMsg(`p1-${i}`, new Date(2026, 7, 20, 0, 0, CHAT_HISTORY_PAGE_SIZE - i).toISOString())
		);
		// Page 2 (older): shorter than a full page — signals "no more history" once loaded.
		const page2: ChatDTO[] = [
			chatMsg('p2-2', new Date(2026, 7, 19, 23, 59, 58).toISOString()),
			chatMsg('p2-1', new Date(2026, 7, 19, 23, 59, 57).toISOString())
		];

		fetchSpy.mockImplementation(async (_artistId: string, before?: string) =>
			before ? { ok: true, messages: page2 } : { ok: true, messages: page1 }
		);

		render(ChatWidget, { artistId: 'a1', isSubscriber: true, isArtist: false });

		await expect.element(page.getByText('msg p1-0')).toBeInTheDocument();
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(document.querySelectorAll('.message-list li')).toHaveLength(CHAT_HISTORY_PAGE_SIZE);

		const scrollEl = document.querySelector('.message-scroll') as HTMLElement;
		scrollEl.scrollTop = 0;
		scrollEl.dispatchEvent(new Event('scroll', { bubbles: true }));

		await expect.element(page.getByText('msg p2-1')).toBeInTheDocument();
		expect(fetchSpy).toHaveBeenCalledTimes(2);
		// The cursor is the oldest message loaded so far — the tail of page 1.
		expect(fetchSpy).toHaveBeenLastCalledWith('a1', page1[page1.length - 1].createdAt);
		expect(document.querySelectorAll('.message-list li')).toHaveLength(
			CHAT_HISTORY_PAGE_SIZE + page2.length
		);

		// Page 2 was short (below CHAT_HISTORY_PAGE_SIZE) — no more history, so a
		// further scroll-to-top must not fetch a third page.
		scrollEl.scrollTop = 0;
		scrollEl.dispatchEvent(new Event('scroll', { bubbles: true }));
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});
});

describe('ChatWidget — dedup and delete', () => {
	it('dedupes a message that lands in both the initial history fetch and the live stream', async () => {
		const { fetchChatHistory } = await import('$lib/client/chat');
		const { getChatRoom } = await import('$lib/remote/chat.remote');
		const createdAt = new Date(2026, 7, 20, 0, 0, 1).toISOString();

		vi.mocked(fetchChatHistory).mockResolvedValue({
			ok: true,
			messages: [chatMsg('dup-1', createdAt)]
		});
		// A message posted right as the live connection opens can arrive both via
		// the history REST fetch and the live frame — the widget must show it once.
		// Signals when the generator itself is exhausted, so the test can wait for
		// both frames to have actually been consumed instead of guessing a delay.
		let liveFramesDone!: () => void;
		const liveFramesConsumed = new Promise<void>((resolve) => (liveFramesDone = resolve));
		vi.mocked(getChatRoom).mockReturnValueOnce(
			(async function* () {
				yield { type: 'presence', onlineCount: 1, artistOnline: true };
				yield { type: 'message', message: chatMsg('dup-1', createdAt) };
				liveFramesDone();
			})() as unknown as ReturnType<typeof getChatRoom>
		);

		render(ChatWidget, { artistId: 'a1', isSubscriber: false, isArtist: true });

		await expect.element(page.getByText('msg dup-1')).toBeInTheDocument();
		await liveFramesConsumed;
		// Both applyFrame() calls have run synchronously by now — flush Svelte's
		// pending reactive update before reading the DOM.
		await tick();
		expect(document.querySelectorAll('.message-list li')).toHaveLength(1);
	});

	it('removes a deleted message from the list immediately, without a reload', async () => {
		const { fetchChatHistory, deleteChatMessage } = await import('$lib/client/chat');
		vi.mocked(fetchChatHistory).mockResolvedValue({
			ok: true,
			messages: [
				{ ...chatMsg('del-1', new Date(2026, 7, 20, 0, 0, 1).toISOString()), canDelete: true }
			]
		});
		vi.mocked(deleteChatMessage).mockResolvedValue({ ok: true });

		render(ChatWidget, { artistId: 'a1', isSubscriber: true, isArtist: false });

		await expect.element(page.getByText('msg del-1')).toBeInTheDocument();
		await page.getByRole('button', { name: /more actions/i }).click();
		await page.getByRole('button', { name: /delete comment/i }).click();

		await expect.element(page.getByText('msg del-1')).not.toBeInTheDocument();
	});

	it('leaves the message in place when the server refuses the delete', async () => {
		const { fetchChatHistory, deleteChatMessage } = await import('$lib/client/chat');
		vi.mocked(fetchChatHistory).mockResolvedValue({
			ok: true,
			messages: [
				{ ...chatMsg('del-2', new Date(2026, 7, 20, 0, 0, 1).toISOString()), canDelete: true }
			]
		});
		vi.mocked(deleteChatMessage).mockResolvedValue({ ok: false, error: 'forbidden' });

		render(ChatWidget, { artistId: 'a1', isSubscriber: true, isArtist: false });

		await expect.element(page.getByText('msg del-2')).toBeInTheDocument();
		await page.getByRole('button', { name: /more actions/i }).click();
		await page.getByRole('button', { name: /delete comment/i }).click();

		await expect.element(page.getByText('msg del-2')).toBeInTheDocument();
	});
});
