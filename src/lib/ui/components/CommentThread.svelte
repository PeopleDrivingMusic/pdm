<script lang="ts">
	import CommentToggle from './CommentToggle.svelte';
	import CommentSection from './CommentSection.svelte';
	import type { CommentTargetType } from '$lib/client/comments';

	/**
	 * Convenience composition of `CommentToggle` + `CommentSection` for surfaces
	 * that want the whole thing in one place. Where the layout needs the count
	 * button and the panel in different containers (a card footer vs a full-width
	 * row below it), use the two components directly instead.
	 */
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
	let count = $state(initialCount);
</script>

<div class="comment-thread">
	<CommentToggle {count} {expanded} onToggle={() => (expanded = !expanded)} />

	{#if expanded}
		<div class="thread-panel">
			<CommentSection {targetType} {targetId} {isLoggedIn} onCountChange={(n) => (count = n)} />
		</div>
	{/if}
</div>

<style lang="scss">
	.comment-thread {
		width: 100%;
	}

	.thread-panel {
		margin-top: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid color-mix(in srgb, var(--border-primary) 55%, transparent);
	}
</style>
