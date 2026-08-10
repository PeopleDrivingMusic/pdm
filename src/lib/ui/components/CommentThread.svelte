<script lang="ts">
	import { mdiChatOutline } from '@mdi/js';
	import SvgIcon from '../SvgIcon.svelte';
	import MessageList, { type Message } from './MessageList.svelte';
	import MessageComposer from './MessageComposer.svelte';
	import {
		fetchComments,
		createComment,
		editComment,
		deleteComment,
		type CommentTargetType
	} from '$lib/client/comments';

	let {
		targetType,
		targetId,
		isLoggedIn,
		initialCount = 0,
		open = false
	}: {
		targetType: CommentTargetType;
		targetId: string;
		isLoggedIn: boolean;
		initialCount?: number;
		open?: boolean;
	} = $props();

	let expanded = $state(open);
	let loaded = $state(false);
	let loading = $state(false);
	let comments = $state<Message[]>([]);
	let count = $state(initialCount);
	let error = $state('');

	async function toggle() {
		expanded = !expanded;
		// Lazily fetch on first open only — reopening reuses what we already have.
		if (expanded && !loaded) await load();
	}

	async function load() {
		loading = true;
		error = '';
		const result = await fetchComments(targetType, targetId);
		loading = false;
		loaded = true;
		if (!result.ok) {
			error = result.error;
			return;
		}
		comments = result.comments;
		count = result.comments.length;
	}

	async function post(body: string) {
		error = '';
		const result = await createComment(targetType, targetId, body);
		if (!result.ok) {
			error = result.error;
			return;
		}
		comments = [result.comment, ...comments];
		count += 1;
	}

	async function saveEdit(id: string, body: string) {
		error = '';
		const result = await editComment(id, body);
		if (!result.ok) {
			error = result.error;
			return;
		}
		comments = comments.map((entry) => (entry.id === id ? result.comment : entry));
	}

	async function remove(id: string) {
		error = '';
		const result = await deleteComment(id);
		if (!result.ok) {
			error = result.error;
			return;
		}
		comments = comments.filter((entry) => entry.id !== id);
		count = Math.max(0, count - 1);
	}
</script>

<div class="comment-thread">
	<button
		type="button"
		class="toggle"
		aria-expanded={expanded}
		aria-label="Comments"
		onclick={toggle}
	>
		<SvgIcon path={mdiChatOutline} size={20} />
		<span>{count}</span>
	</button>

	{#if expanded}
		<div class="thread-panel">
			{#if loading}
				<p class="thread-note">Loading comments…</p>
			{/if}

			{#if error}
				<p class="thread-error" role="alert">{error}</p>
			{/if}

			{#if comments.length}
				<MessageList messages={comments} onEdit={saveEdit} onDelete={remove} />
			{:else if loaded && !loading && !error}
				<p class="thread-note">No comments yet. Be the first.</p>
			{/if}

			{#if isLoggedIn}
				<MessageComposer onSubmit={post} />
			{:else}
				<a class="login-prompt" href="/login">Log in to comment</a>
			{/if}
		</div>
	{/if}
</div>

<style lang="scss">
	.comment-thread {
		width: 100%;
	}

	.toggle {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		// Comfortable tap target on touch screens.
		min-height: 44px;
		padding: 0 var(--space-2);
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		cursor: pointer;

		&:hover {
			color: var(--text-primary);
		}
	}

	.thread-panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-top: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid color-mix(in srgb, var(--border-primary) 55%, transparent);
	}

	.thread-note {
		margin: 0;
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
	}

	.thread-error {
		margin: 0;
		color: var(--error, #e5484d);
		font-size: var(--font-size-sm);
	}

	.login-prompt {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--primary);
		font-size: var(--font-size-sm);
		font-weight: 600;
	}
</style>
