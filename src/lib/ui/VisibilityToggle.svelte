<script lang="ts">
	import { mdiEarth, mdiLock } from '@mdi/js';
	import SegmentedControl from './SegmentedControl.svelte';

	let {
		value = $bindable(),
		level,
		inheritedFrom = null,
		disabled = false,
		onChange
	}: {
		value: 'public' | 'subscribers_only';
		level: 'album' | 'track';
		inheritedFrom?: 'album' | null;
		disabled?: boolean;
		onChange?: (v: 'public' | 'subscribers_only') => void;
	} = $props();

	let overridden = $state(false);
	const locked = $derived(inheritedFrom === 'album' && !overridden);

	const options = [
		{ value: 'public', label: 'Public', icon: mdiEarth },
		{ value: 'subscribers_only', label: 'Subscribers', icon: mdiLock }
	];

	function handleChange(v: string) {
		value = v as 'public' | 'subscribers_only';
		onChange?.(value);
	}
</script>

<div class="visibility-toggle">
	<SegmentedControl
		{value}
		{options}
		disabled={disabled || locked}
		ariaLabel={`${level} visibility`}
		onChange={handleChange}
	/>
	{#if locked}
		<span class="cue">
			Subscribers-only (from album)
			<button type="button" class="override" onclick={() => (overridden = true)}>Override</button>
		</span>
	{:else if value === 'subscribers_only'}
		<span class="helper">Only your $1/mo subscribers can play this.</span>
	{/if}
</div>

<style lang="scss">
	.visibility-toggle {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.cue,
	.helper {
		font-size: var(--font-size-xs);
		color: var(--text-tertiary);
	}
	.cue {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
	}
	.override {
		border: 0;
		background: transparent;
		color: var(--gate-tint-text);
		cursor: pointer;
		text-decoration: underline;
		font-size: inherit;
		padding: 0;
	}
</style>
