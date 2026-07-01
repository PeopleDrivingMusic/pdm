<script lang="ts">
	import SvgIcon from './SvgIcon.svelte';
	let {
		variant,
		label,
		icon
	}: {
		variant: 'draft' | 'published' | 'scheduled' | 'uploading' | 'failed' | 'gate';
		label: string;
		icon?: string;
	} = $props();
</script>

<span class="badge {variant}">
	{#if icon}<SvgIcon path={icon} size={14} />{/if}
	<span class="label">{label}</span>
</span>

<style lang="scss">
	.badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		white-space: nowrap;

		&.draft {
			background: var(--status-draft-bg);
			color: var(--status-draft-text);
		}
		&.published {
			background: var(--status-published-bg);
			color: var(--status-published-text);
		}
		&.scheduled {
			background: var(--status-scheduled-bg);
			color: var(--status-scheduled-text);
		}
		&.uploading {
			background: var(--status-scheduled-bg);
			color: var(--status-scheduled-text);
		}
		&.failed {
			background: var(--status-failed-bg);
			color: var(--status-failed-text);
		}
		&.gate {
			background: var(--gate-tint-bg);
			color: var(--gate-tint-text);
		}
	}
</style>
