<script lang="ts">
	import { onMount } from 'svelte';
	import { mdiChatOutline } from '@mdi/js';
	import { getChatRoom } from '$lib/remote/chat.remote';
	import { fetchChatHistory, postChatMessage, deleteChatMessage } from '$lib/client/chat';
	import { chatStore } from '$lib/stores/chat.svelte';
	import MessageList from './MessageList.svelte';
	import MessageComposer from './MessageComposer.svelte';
	import SvgIcon from '../SvgIcon.svelte';
	import Button from '../Button.svelte';
	import type { ChatDTO, ChatFrame } from '$lib/messages/types';

	let {
		artistId,
		isSubscriber,
		// Not read yet in this task — kept in the prop contract for Task 13's
		// consumer (`<ChatWidget artistId isSubscriber isArtist canSubscribe />`)
		// and for future artist-specific behavior in the room.
		isArtist: _isArtist,
		canSubscribe,
		onSubscribe
	}: {
		artistId: string;
		isSubscriber: boolean;
		isArtist: boolean;
		canSubscribe: boolean;
		/** Task 13 wires this to the artist page's own `subscribe` action — the
		 *  teaser CTA must trigger the same flow, not a second one. Optional so
		 *  the component doesn't break if a future caller omits it. */
		onSubscribe?: () => void;
	} = $props();

	// Subscribers read from the platform-wide store (opened in the root layout);
	// guests open a page-scoped connection here, torn down on unmount.
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
	onMount(async () => {
		if (!isSubscriber) return;
		const result = await fetchChatHistory(artistId);
		if (result.ok) history = [...result.messages].reverse();
	});

	const messages = $derived(
		isSubscriber
			? [
					...history,
					...(isSubscriber ? (chatStore.rooms[artistId]?.messages ?? localMessages) : [])
						.filter((f): f is Extract<ChatFrame, { type: 'message' }> => f.type === 'message')
						.map((f) => f.message)
				]
			: []
	);

	const teasers = $derived(
		localMessages
			.filter((f): f is Extract<ChatFrame, { type: 'teaser' }> => f.type === 'teaser')
			.slice(-6)
	);

	async function handleSubmit(body: string): Promise<boolean> {
		const result = await postChatMessage(artistId, body);
		return result.ok;
	}

	async function handleDelete(messageId: string) {
		await deleteChatMessage(artistId, messageId);
	}
</script>

<section class="chat-widget">
	<header class="chat-header">
		<div>
			<p class="eyebrow">Community</p>
			<h2>Fan room</h2>
		</div>
		<div class="presence-cluster">
			<span class="online-dot" class:offline={onlineCount === 0}></span>
			<span class="online-count">{onlineCount} online</span>
			{#if artistOnline}
				<span class="artist-badge">Artist here</span>
			{/if}
		</div>
	</header>

	<div class="chat-body">
		{#if isSubscriber}
			{#if messages.length === 0}
				<div class="empty-state">
					<SvgIcon path={mdiChatOutline} size={20} />
					<p>No messages yet — be the first to say hi.</p>
				</div>
			{:else}
				<div class="message-scroll">
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
			<div class="teaser-body" aria-hidden="true">
				{#each teasers as frame, index (frame.teaser.id)}
					<div class="teaser-row" class:is-new={index === teasers.length - 1}>
						<span class="teaser-avatar"></span>
						<div class="teaser-lines">
							<span class="teaser-line" class:wide={index % 2 === 0}></span>
						</div>
					</div>
				{/each}
			</div>
			{#if canSubscribe}
				<div class="teaser-cta">
					<p>Subscribe to join the fan room</p>
					<Button onClick={() => onSubscribe?.()}>Subscribe &middot; $1/mo</Button>
				</div>
			{/if}
		{/if}
	</div>
</section>

<style lang="scss">
	// Same shell as the other sidebar modules ("Latest shots" etc.) — this widget
	// must read as "another sidebar card," not a special surface bolted on.
	.chat-widget {
		display: flex;
		flex-direction: column;
		padding: var(--space-5);
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
		min-height: clamp(280px, 40vw, 360px);
	}

	// Subscriber view — message list + composer.
	.message-scroll {
		margin-top: var(--space-3);
		max-height: clamp(260px, 40vw, 340px);
		overflow-y: auto;
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

	// Non-subscriber teaser — synthetic shimmer rows, never real content.
	.teaser-body {
		margin-top: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		cursor: default;
	}

	.teaser-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);

		@media (prefers-reduced-motion: no-preference) {
			animation: teaser-row-enter var(--duration-normal) var(--easing-ease-out);
		}
	}

	@keyframes teaser-row-enter {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes skeleton-shimmer {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}

	// The one place the teaser gets a slightly richer flourish than the subscriber
	// view: the newest row eases from a primary-tinted highlight into the normal
	// shimmer, on entry only — never replayed on rows already present.
	@keyframes teaser-arrival-tint {
		from {
			box-shadow: inset 0 0 0 999px var(--chat-arrival-tint);
		}
		to {
			box-shadow: inset 0 0 0 999px transparent;
		}
	}

	.teaser-row.is-new .teaser-avatar,
	.teaser-row.is-new .teaser-line {
		@media (prefers-reduced-motion: no-preference) {
			animation:
				skeleton-shimmer 1.4s ease-in-out infinite,
				teaser-arrival-tint var(--duration-slow) var(--easing-ease-out);
		}
	}

	.teaser-avatar,
	.teaser-line {
		border-radius: var(--radius-lg);
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--bg-surface) 70%, transparent) 25%,
			color-mix(in srgb, var(--bg-tertiary) 90%, transparent) 50%,
			color-mix(in srgb, var(--bg-surface) 70%, transparent) 75%
		);
		background-size: 200% 100%;

		@media (prefers-reduced-motion: no-preference) {
			animation: skeleton-shimmer 1.4s ease-in-out infinite;
		}

		// Freeze rather than loop forever for a viewer who asked for less motion —
		// a gap the shared ContentSkeleton pattern doesn't yet cover either.
		@media (prefers-reduced-motion: reduce) {
			animation: none;
			background-position: 0 0;
		}
	}

	.teaser-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.teaser-lines {
		flex: 1;
		min-width: 0;
	}

	.teaser-line {
		display: block;
		height: 10px;
		width: 45%;

		&.wide {
			width: 70%;
		}
	}

	.teaser-cta {
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--chat-divider);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-3);

		p {
			margin: 0;
			color: var(--text-secondary);
			font-size: var(--font-size-sm);
		}
	}

	@media (max-width: 720px) {
		.chat-widget {
			border-radius: var(--radius-md);
		}
	}
</style>
