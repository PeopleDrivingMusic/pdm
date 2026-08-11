<script lang="ts">
	import SvgIcon from './SvgIcon.svelte';

	interface Props {
		path: string;
		label: string;
		type?: 'button' | 'submit' | 'reset';
		/** `solid` carries a border + surface; `ghost` is chrome-free for inline rows. */
		variant?: 'solid' | 'ghost';
		/** `sm` matches a `size="sm"` Button; it keeps a 44px tap area via a hit-slop. */
		size?: 'sm' | 'md';
		active?: boolean;
		disabled?: boolean;
		onClick?: () => void;
	}

	let {
		path,
		label,
		type = 'button',
		variant = 'solid',
		size = 'md',
		active = false,
		disabled = false,
		onClick
	}: Props = $props();
</script>

<button
	{type}
	class="icon-button icon-button--{variant} icon-button--{size}"
	class:icon-button--active={active}
	{disabled}
	aria-label={label}
	title={label}
	onclick={onClick}
>
	<SvgIcon {path} size={size === 'sm' ? 18 : 18} />
</button>

<style lang="scss">
	.icon-button {
		position: relative;
		width: 40px;
		height: 40px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-md);
		background: var(--bg-surface);
		color: var(--text-secondary);
	}

	// Chrome-free: for inline rows where a boxed control would out-weigh its
	// neighbours (e.g. next to a small Button).
	.icon-button--ghost {
		border-color: transparent;
		background: transparent;

		&:hover:not(:disabled),
		&:focus-visible {
			border-color: transparent;
			background: color-mix(in srgb, var(--bg-tertiary) 70%, transparent);
		}
	}

	.icon-button--sm {
		width: 32px;
		height: 32px;

		// Stays a 44px target on touch without taking 44px of layout.
		&::after {
			content: '';
			position: absolute;
			inset: -6px;
		}
	}

	.icon-button {
		cursor: pointer;
		transition:
			background-color var(--duration-fast) var(--easing-ease-out),
			border-color var(--duration-fast) var(--easing-ease-out),
			color var(--duration-fast) var(--easing-ease-out);

		&:hover:not(:disabled),
		&:focus-visible {
			border-color: var(--border-focus);
			color: var(--text-primary);
		}

		&:focus-visible {
			outline: none;
			box-shadow: var(--focus-ring-primary);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.icon-button--active {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--text-on-primary);
	}
</style>
