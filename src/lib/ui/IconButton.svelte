<script lang="ts">
	import SvgIcon from './SvgIcon.svelte';

	interface Props {
		path: string;
		label: string;
		type?: 'button' | 'submit' | 'reset';
		/** `solid` carries a border + surface; `ghost` is chrome-free for inline rows. */
		variant?: 'solid' | 'ghost';
		/** `xs`/`sm` match `Button` sizes; each keeps a 44px tap area via a hit-slop. */
		size?: 'xs' | 'sm' | 'md';
		/** Solid-fill toggle state (toolbar formatting buttons, the emoji picker trigger). */
		active?: boolean;
		/** Color-only toggle state — for a "liked" heart etc., where a filled background
		 *  would compete with the row it sits in. Independent of `active`. Passing
		 *  either value (not just 'accent') also opts the button into `aria-pressed`,
		 *  since only toggle-style callers use this prop at all. */
		tone?: 'neutral' | 'accent';
		/** When set, the button widens to fit a trailing count instead of staying square;
		 *  the number itself only renders once it's above zero. */
		count?: number;
		disabled?: boolean;
		onClick?: () => void;
	}

	const ICON_SIZE = { xs: 14, sm: 16, md: 18 } as const;

	let {
		path,
		label,
		type = 'button',
		variant = 'solid',
		size = 'md',
		active = false,
		tone,
		count,
		disabled = false,
		onClick
	}: Props = $props();
</script>

<button
	{type}
	class="icon-button icon-button--{variant} icon-button--{size}"
	class:icon-button--active={active}
	class:icon-button--accent={tone === 'accent'}
	class:icon-button--counted={count !== undefined}
	{disabled}
	aria-label={label}
	aria-pressed={tone !== undefined ? tone === 'accent' : undefined}
	title={label}
	onclick={onClick}
>
	<SvgIcon {path} size={ICON_SIZE[size]} />
	{#if count !== undefined && count > 0}
		<span class="icon-button__count">{count}</span>
	{/if}
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

	// Declared after the base rule so its transparent border wins the hover state —
	// same specificity, so order is what decides.
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

	.icon-button--xs {
		width: 28px;
		height: 28px;

		&::after {
			content: '';
			position: absolute;
			inset: -8px;
		}
	}

	.icon-button--active {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--text-on-primary);
	}

	// Color-only toggle — no fill, so it stays quiet in a row of its own
	// content (a comment's like button shouldn't out-shout the comment).
	.icon-button--accent {
		color: var(--primary);
	}

	// Widens to fit the trailing count instead of staying a fixed square.
	.icon-button--counted {
		width: auto;
		min-width: 40px;
		padding: 0 var(--space-2);
		gap: var(--space-1);
	}

	.icon-button--counted.icon-button--sm,
	.icon-button--counted.icon-button--xs {
		min-width: 32px;
		padding: 0 var(--space-1);
	}

	.icon-button__count {
		font-size: var(--font-size-xs);
		line-height: 1;
	}
</style>
