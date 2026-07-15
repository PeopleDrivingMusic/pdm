<script lang="ts">
	import SvgIcon from './SvgIcon.svelte';
	type Option = { value: string; label: string; icon?: string };
	let {
		value = $bindable(),
		options,
		disabled = false,
		ariaLabel,
		onChange
	}: {
		value: string;
		options: Option[];
		disabled?: boolean;
		ariaLabel: string;
		onChange?: (v: string) => void;
	} = $props();

	function select(v: string) {
		if (disabled || v === value) return;
		value = v;
		onChange?.(v);
	}

	function onKey(e: KeyboardEvent, index: number) {
		if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
		e.preventDefault();
		const next =
			e.key === 'ArrowRight'
				? (index + 1) % options.length
				: (index - 1 + options.length) % options.length;
		select(options[next].value);
	}
</script>

<div class="segmented" role="radiogroup" aria-label={ariaLabel}>
	{#each options as option, i (option.value)}
		<button
			type="button"
			role="radio"
			aria-checked={value === option.value}
			class:active={value === option.value}
			{disabled}
			onclick={() => select(option.value)}
			onkeydown={(e) => onKey(e, i)}
		>
			{#if option.icon}<SvgIcon path={option.icon} size={16} />{/if}
			<span>{option.label}</span>
		</button>
	{/each}
</div>

<style lang="scss">
	.segmented {
		display: inline-flex;
		gap: var(--space-1);
		padding: 2px;
		border-radius: var(--radius-md);
		background: var(--bg-secondary);
		border: 1px solid var(--border-primary);

		button {
			display: inline-flex;
			align-items: center;
			gap: var(--space-1);
			padding: var(--space-1) var(--space-3);
			min-height: 32px;
			border: 0;
			border-radius: var(--radius-sm);
			background: transparent;
			color: var(--text-secondary);
			font-size: var(--font-size-sm);
			cursor: pointer;
			transition:
				background var(--duration-fast),
				color var(--duration-fast);

			&.active {
				background: var(--bg-surface);
				color: var(--text-primary);
			}
			&:focus-visible {
				outline: 2px solid var(--border-focus);
				outline-offset: 1px;
			}
			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}
	}
</style>
