<script lang="ts">
	import { mdiChatOutline } from '@mdi/js';
	import SvgIcon from '../SvgIcon.svelte';

	/**
	 * The comment count affordance on its own — no data fetching, no panel. Kept
	 * separate from `CommentSection` so a card footer can place the button while
	 * the panel opens full-width elsewhere in the layout.
	 */
	let {
		count,
		expanded = false,
		onToggle
	}: {
		count: number;
		expanded?: boolean;
		onToggle?: () => void;
	} = $props();
</script>

<button
	type="button"
	class="comment-toggle"
	aria-label="Comments"
	aria-expanded={expanded}
	onclick={onToggle}
>
	<SvgIcon path={mdiChatOutline} size={20} />
	<span>{count}</span>
</button>

<style lang="scss">
	.comment-toggle {
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

		&:hover,
		&[aria-expanded='true'] {
			color: var(--text-primary);
		}
	}
</style>
