<script lang="ts">
	import MessageList from './MessageList.svelte';
	import MessageComposer from './MessageComposer.svelte';
	import Link from '../Link.svelte';
	import {
		fetchComments,
		createComment,
		editComment,
		deleteComment,
		toggleLike,
		type CommentTargetType
	} from '$lib/client/comments';
	import { notificationStore } from '$lib/stores/notification.svelte';
	import type { MessageDTO } from '$lib/messages/types';

	/**
	 * The comment panel for one target: owns loading and mutation state, and
	 * nothing else. Independent of the count button (`CommentToggle`) so either
	 * can be placed on its own — a card footer, a player tab, a sidebar.
	 */
	let {
		targetType,
		targetId,
		isLoggedIn,
		onCountChange
	}: {
		targetType: CommentTargetType;
		targetId: string;
		isLoggedIn: boolean;
		/**
		 * Signed change to the target's comment count. A delta, not a total: the
		 * list is a capped page while the count is a real `COUNT(*)`, so publishing
		 * `comments.length` would shrink a thread of 80 down to the page size.
		 */
		onCountChange?: (delta: number) => void;
	} = $props();

	let loading = $state(true);
	let comments = $state<MessageDTO[]>([]);
	let error = $state('');

	// Load as soon as the panel exists — the parent decides when to mount it.
	$effect(() => {
		void targetId;
		load();
	});

	// Guards against a slow response for an earlier target landing after a newer one
	// and rendering the wrong thread.
	let loadToken = 0;

	async function load() {
		const token = ++loadToken;
		loading = true;
		error = '';
		const result = await fetchComments(targetType, targetId);
		if (token !== loadToken) return;

		loading = false;
		if (!result.ok) {
			error = result.error;
			return;
		}
		comments = result.comments;
	}

	async function post(body: string): Promise<boolean> {
		error = '';
		const result = await createComment(targetType, targetId, body);
		if (!result.ok) {
			error = result.error;
			return false;
		}
		comments = [result.comment, ...comments];
		onCountChange?.(1);
		return true;
	}

	async function saveEdit(id: string, body: string): Promise<boolean> {
		error = '';
		const result = await editComment(id, body);
		if (!result.ok) {
			error = result.error;
			return false;
		}
		comments = comments.map((entry) => (entry.id === id ? result.comment : entry));
		return true;
	}

	async function toggleCommentLike(id: string) {
		const before = comments.find((entry) => entry.id === id);
		if (!before) return;

		// Optimistic: flip immediately so the tap feels instant, then reconcile with
		// (or roll back to) the server's answer — another reader may have liked the
		// same comment since this page loaded, so a plain increment could drift.
		const optimisticLiked = !before.likedByViewer;
		const optimisticCount = Math.max(0, before.likeCount + (optimisticLiked ? 1 : -1));
		comments = comments.map((entry) =>
			entry.id === id
				? { ...entry, likedByViewer: optimisticLiked, likeCount: optimisticCount }
				: entry
		);

		const result = await toggleLike('comment', id);
		if (!result.ok) {
			comments = comments.map((entry) => (entry.id === id ? before : entry));
			notificationStore.error(result.error);
			return;
		}
		comments = comments.map((entry) =>
			entry.id === id
				? { ...entry, likeCount: result.likeCount, likedByViewer: result.liked }
				: entry
		);
	}

	async function remove(id: string) {
		error = '';
		const result = await deleteComment(id);
		if (!result.ok) {
			error = result.error;
			return;
		}
		comments = comments.filter((entry) => entry.id !== id);
		onCountChange?.(-1);
	}
</script>

<div class="comment-section" aria-busy={loading}>
	<!-- Composer first: acting shouldn't require scrolling past the whole thread. -->
	{#if isLoggedIn}
		<MessageComposer onSubmit={post} />
	{:else}
		<!-- Reading stays public; only writing needs an account. A plain link (not a
		     focus-triggered redirect) until /login can return the reader here — see
		     the redirectTo tech-debt note in the comments plan. -->
		<p class="login-prompt"><Link href="/login">Log in to comment</Link></p>
	{/if}

	{#if error}
		<p class="section-error" role="alert">{error}</p>
	{/if}

	{#if loading}
		<div class="skeleton-stack" data-testid="comment-skeleton" aria-hidden="true">
			{#each Array(3), i (i)}
				<div class="message-skeleton"></div>
			{/each}
		</div>
	{:else if comments.length}
		<MessageList
			messages={comments}
			onEdit={saveEdit}
			onDelete={remove}
			onToggleLike={isLoggedIn ? toggleCommentLike : undefined}
		/>
	{:else if !error}
		<p class="section-note">No comments yet. Be the first.</p>
	{/if}
</div>

<style lang="scss">
	.comment-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		width: 100%;
	}

	.section-note {
		margin: 0;
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
	}

	.section-error {
		margin: 0;
		color: var(--error, #e5484d);
		font-size: var(--font-size-sm);
	}

	.login-prompt {
		margin: 0;
		display: flex;
		align-items: center;
		min-height: 44px;
	}

	.skeleton-stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	@keyframes skeleton-shimmer {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}

	.message-skeleton {
		height: 52px;
		border-radius: var(--radius-md);
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--bg-surface) 70%, transparent) 25%,
			color-mix(in srgb, var(--bg-tertiary) 90%, transparent) 50%,
			color-mix(in srgb, var(--bg-surface) 70%, transparent) 75%
		);
		background-size: 200% 100%;
		animation: skeleton-shimmer 1.4s ease-in-out infinite;
	}
</style>
