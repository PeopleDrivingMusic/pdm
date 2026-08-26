<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { mdiChatOutline } from '@mdi/js';
	import { getChatRoom } from '$lib/remote/chat.remote';
	import { fetchChatHistory, postChatMessage, deleteChatMessage } from '$lib/client/chat';
	import { chatStore } from '$lib/stores/chat.svelte';
	import MessageList from './MessageList.svelte';
	import MessageComposer from './MessageComposer.svelte';
	import SvgIcon from '../SvgIcon.svelte';
	import LockedPanel from './LockedPanel.svelte';
	import { CHAT_HISTORY_PAGE_SIZE, type ChatDTO, type ChatFrame } from '$lib/messages/types';

	let {
		artistId,
		isSubscriber,
		isArtist
	}: {
		artistId: string;
		isSubscriber: boolean;
		isArtist: boolean;
	} = $props();

	// The artist always has full access to their own room — they can't subscribe to
	// themselves, so `isSubscriber` alone would otherwise lock them out of it.
	const hasAccess = $derived(isSubscriber || isArtist);

	// Subscribers read from the platform-wide store (opened in the root layout).
	// The artist opens their own page-scoped connection here (they're not "a
	// subscriber" of themselves, so they're not in that store), torn down on
	// unmount. A plain guest gets neither — they can't see real messages anyway,
	// so there is nothing worth holding a live connection open for; the locked
	// panel is fully static.
	let localMessages = $state<ChatFrame[]>([]);
	let onlineCount = $state(0);
	let artistOnline = $state(false);

	function applyFrame(frame: ChatFrame) {
		if (frame.type === 'presence') {
			onlineCount = frame.onlineCount;
			artistOnline = frame.artistOnline;
		} else {
			localMessages = [...localMessages, frame];
		}
	}

	$effect(() => {
		if (isSubscriber) {
			const room = chatStore.rooms[artistId];
			if (room) {
				onlineCount = room.onlineCount;
				artistOnline = room.artistOnline;
			}
			return;
		}
		if (!isArtist) return;

		let cancelled = false;
		(async () => {
			for await (const frame of getChatRoom(artistId)) {
				if (cancelled) break;
				applyFrame(frame);
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	let history = $state<ChatDTO[]>([]);
	// A page shorter than the page size means the server has no more history —
	// stops further scroll-triggered fetches instead of hammering an empty tail.
	let hasMoreHistory = $state(true);
	let loadingOlder = $state(false);
	let scrollEl = $state<HTMLDivElement | null>(null);

	onMount(async () => {
		if (!hasAccess) return;
		const result = await fetchChatHistory(artistId);
		if (!result.ok) return;
		history = [...result.messages].reverse();
		hasMoreHistory = result.messages.length === CHAT_HISTORY_PAGE_SIZE;
		// Land on the latest message, not the oldest of the loaded page — a chat
		// room opens on "now," and scrolling up is what reveals older history.
		await tick();
		if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
	});

	async function loadOlderHistory() {
		if (loadingOlder || !hasMoreHistory || history.length === 0) return;
		loadingOlder = true;
		try {
			const oldest = history[0].createdAt;
			const result = await fetchChatHistory(artistId, oldest);
			if (!result.ok) return;
			hasMoreHistory = result.messages.length === CHAT_HISTORY_PAGE_SIZE;
			if (result.messages.length === 0) return;

			const el = scrollEl;
			const prevScrollHeight = el?.scrollHeight ?? 0;
			const prevScrollTop = el?.scrollTop ?? 0;
			history = [...result.messages].reverse().concat(history);

			// Prepending content above the viewport shifts everything down — restore
			// the reader's position relative to the message they were looking at
			// instead of letting the browser leave scrollTop unchanged (which would
			// visually jerk the whole list downward).
			await tick();
			if (el) el.scrollTop = el.scrollHeight - prevScrollHeight + prevScrollTop;
		} finally {
			loadingOlder = false;
		}
	}

	function handleScroll() {
		// Near the top of the scroll area — close enough that the fetch resolves
		// before the reader hits the literal top and sees the list stop dead.
		if (scrollEl && scrollEl.scrollTop < 120) loadOlderHistory();
	}

	// A message posted in the narrow window between the initial history fetch
	// resolving and the live connection actually starting can land in both —
	// keep only the first occurrence (history's, already in its correct
	// chronological slot) rather than rendering it twice.
	function dedupeById(list: ChatDTO[]): ChatDTO[] {
		// Scratch structure local to this one pass — never read across renders,
		// so it doesn't need SvelteSet's reactivity.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const seen = new Set<string>();
		const result: ChatDTO[] = [];
		for (const message of list) {
			if (seen.has(message.id)) continue;
			seen.add(message.id);
			result.push(message);
		}
		return result;
	}

	const messages = $derived(
		hasAccess
			? dedupeById([
					...history,
					...(chatStore.rooms[artistId]?.messages ?? localMessages)
						.filter((f): f is Extract<ChatFrame, { type: 'message' }> => f.type === 'message')
						.map((f) => f.message)
				])
			: []
	);

	async function handleSubmit(body: string): Promise<boolean> {
		const result = await postChatMessage(artistId, body);
		return result.ok;
	}

	async function handleDelete(messageId: string) {
		const result = await deleteChatMessage(artistId, messageId);
		if (!result.ok) return;

		// The server accepted the delete — drop it everywhere it might be held
		// locally so it disappears immediately instead of waiting for a reload.
		history = history.filter((m) => m.id !== messageId);
		localMessages = localMessages.filter((f) => f.type !== 'message' || f.message.id !== messageId);
		const room = chatStore.rooms[artistId];
		if (room) {
			room.messages = room.messages.filter(
				(f) => f.type !== 'message' || f.message.id !== messageId
			);
		}
	}
</script>

<section class="chat-widget">
	<header class="chat-header">
		<div>
			<p class="eyebrow">Community</p>
			<h2>Fan room</h2>
		</div>
		{#if hasAccess}
			<div class="presence-cluster">
				<span class="online-dot" class:offline={onlineCount === 0}></span>
				<span class="online-count">{onlineCount} online</span>
				{#if artistOnline}
					<span class="artist-badge">Artist here</span>
				{/if}
			</div>
		{/if}
	</header>

	<div class="chat-body">
		{#if hasAccess}
			{#if messages.length === 0}
				<div class="empty-state">
					<SvgIcon path={mdiChatOutline} size={20} />
					<p>No messages yet — be the first to say hi.</p>
				</div>
			{:else}
				<div class="message-scroll" bind:this={scrollEl} onscroll={handleScroll}>
					{#if loadingOlder}
						<p class="loading-older">Loading earlier messages…</p>
					{/if}
					<MessageList
						messages={messages.map((m) => ({
							...m,
							editedAt: null,
							canEdit: false,
							likeCount: 0,
							likedByViewer: false
						}))}
						onDelete={handleDelete}
					/>
				</div>
			{/if}
			<div class="composer-slot">
				<MessageComposer placeholder="Message the room…" onSubmit={handleSubmit} />
			</div>
		{:else}
			<div class="teaser-locked">
				<!-- Only the synthetic decoration is hidden from assistive tech — the
				     surrounding container and LockedPanel's actual message must stay
				     exposed, or a screen reader user gets nothing here at all. -->
				<div class="teaser-decoration" aria-hidden="true">
					{#each Array(14) as _, index (index)}
						<div class="teaser-row">
							<span class="teaser-avatar"></span>
							<span class="teaser-line" class:wide={index % 2 === 0}></span>
						</div>
					{/each}
				</div>
				<LockedPanel />
			</div>
		{/if}
	</div>
</section>

<style lang="scss">
	// Same shell as the other sidebar modules ("Latest shots" etc.) — this widget
	// must read as "another sidebar card," not a special surface bolted on.
	.chat-widget {
		display: flex;
		flex-direction: column;
		// Fills the sidebar's full height (the artist page stretches `.side-content`
		// to match the main column) instead of only being as tall as its content.
		flex: 1;
		min-height: 0;
		padding: var(--space-5);
		// The teaser lock bleeds past this padding to the card's own edges (see
		// `.teaser-locked`'s negative margins) — clipped here so it still respects
		// the card's rounded corners instead of squaring them off.
		overflow: hidden;
		border-radius: var(--radius-lg);
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.03), transparent 48%),
			color-mix(in srgb, var(--bg-surface) 72%, var(--bg-primary));
		box-shadow: 0 14px 44px rgba(0, 0, 0, 0.18);
	}

	.chat-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);

		h2 {
			margin: 0;
			color: var(--text-primary);
			font-size: var(--font-size-lg);
			line-height: 1.2;
		}
	}

	.eyebrow {
		margin: 0 0 var(--space-1);
		color: var(--primary);
		font-size: var(--font-size-xs);
		font-weight: 700;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.presence-cluster {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.online-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--success);
		box-shadow: 0 0 0 5px var(--chat-presence-ring);
		flex-shrink: 0;

		&.offline {
			background: var(--text-tertiary);
			box-shadow: none;
		}
	}

	.online-count {
		color: var(--text-secondary);
		font-size: var(--font-size-xs);
		font-variant-numeric: tabular-nums;

		@media (prefers-reduced-motion: no-preference) {
			transition: opacity var(--duration-fast) var(--easing-ease-out);
		}
	}

	.artist-badge {
		padding: 1px 6px;
		border-radius: 999px;
		background: var(--chat-artist-badge-bg);
		color: var(--chat-artist-badge-text);
		font-weight: 700;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.04em;

		@media (prefers-reduced-motion: no-preference) {
			animation: badge-enter var(--duration-normal) var(--easing-ease-out);
		}
	}

	@keyframes badge-enter {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.chat-body {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	// Subscriber view — message list + composer. Fills whatever height the parent
	// page gives the widget (see the artist page's `.side-content` stretch) rather
	// than capping itself, so the room genuinely uses the full sidebar height.
	.message-scroll {
		margin-top: var(--space-3);
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		// `.like`'s enlarged tap-target pseudo-element extends past the row's own
		// edge on purpose (bigger hit area) — without this, that invisible overhang
		// is enough to make the browser compute a horizontal scrollbar too.
		overflow-x: hidden;
		overscroll-behavior: contain;
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--border-primary) 70%, transparent) transparent;

		&::-webkit-scrollbar {
			width: 6px;
		}
		&::-webkit-scrollbar-thumb {
			background: color-mix(in srgb, var(--border-primary) 70%, transparent);
		}
	}

	.loading-older {
		margin: 0 0 var(--space-3);
		color: var(--text-tertiary);
		font-size: var(--font-size-xs);
		text-align: center;
	}

	.composer-slot {
		margin-top: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--chat-divider);
	}

	.empty-state {
		margin-top: var(--space-3);
		padding: var(--space-5);
		border: 1px dashed color-mix(in srgb, var(--border-primary) 58%, transparent);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--bg-surface) 46%, transparent);
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		flex: 1;
		justify-content: center;

		:global(svg) {
			color: var(--text-tertiary);
		}

		p {
			margin: 0;
		}
	}

	// Non-subscriber teaser — the same locked-overlay recipe as the feed and posts
	// (`LockedPanel`): a blurred scrim over inert decoration, never real message
	// content. `teaser-decoration` is purely synthetic (aria-hidden, static shapes) —
	// the security boundary is that real messages never reach this branch at all,
	// not that they're merely hidden behind the blur.
	.teaser-locked {
		position: relative;
		flex: 1;
		margin-top: var(--space-3);
		// Bleed past the card's own padding on the sides and bottom — the lock
		// reads as covering the room "wall to wall," not sitting indented inside
		// the card's normal content padding. `.chat-widget`'s `overflow: hidden`
		// clips this back to the card's rounded corners.
		margin-inline: calc(-1 * var(--space-5));
		margin-bottom: calc(-1 * var(--space-5));
		overflow: hidden;
		background: color-mix(in srgb, var(--bg-surface) 60%, transparent);
	}

	.teaser-decoration {
		position: absolute;
		inset: 0;
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.teaser-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.teaser-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		flex-shrink: 0;
		background: var(--border-primary);
	}

	.teaser-line {
		display: block;
		height: 10px;
		width: 45%;
		border-radius: var(--radius-lg);
		background: var(--border-primary);

		&.wide {
			width: 70%;
		}
	}

	@media (max-width: 720px) {
		.chat-widget {
			border-radius: var(--radius-md);
		}
	}
</style>
