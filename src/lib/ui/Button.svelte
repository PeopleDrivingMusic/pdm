<script lang="ts">
	interface Props {
		variant?: 'primary' | 'secondary' | 'google';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		size?: 'sm' | 'md' | 'lg';
		href?: string;
		onClick?: () => void;
		children?: () => any;
	}

	let {
		variant = 'primary',
		type = 'button',
		disabled = false,
		href = '',
		size = 'md',
		onClick,
		children
	}: Props = $props();
</script>

{#if href}
	<a {href} class="btn btn--{variant}">
		{@render children?.()}
	</a>
{:else}
	<!-- else content here -->
	<button class="btn btn--{variant} {size}" {type} {disabled} onclick={onClick}>
		{@render children?.()}
	</button>
{/if}

<style lang="scss">
	.btn {
		padding: var(--space-3) var(--space-6);
		border-radius: var(--radius-md);
		border: none;
		font-weight: var(--font-weight-medium);
		font-size: var(--font-size-sm);
		font-family: var(--font-family-sans);
		cursor: pointer;
		transition: all var(--duration-normal) var(--easing-ease-out);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		width: 100%;
		box-shadow: var(--shadow-xs);
		position: relative;
		overflow: hidden;

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}

		&:focus-visible {
			outline: none;
			box-shadow: var(--focus-ring-primary);
		}

		&--primary {
			background: linear-gradient(135deg, var(--color-brand-400) 0%, var(--color-brand-600) 100%);
			color: var(--text-on-primary);
			box-shadow: var(--shadow-sm);

			&:hover:not(:disabled) {
				background: linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-700) 100%);
				box-shadow: var(--shadow-md);
				transform: translateY(-1px);
			}

			&:active:not(:disabled) {
				transform: translateY(0);
				box-shadow: var(--shadow-xs);
			}
		}

		&--secondary {
			background-color: transparent;
			color: var(--text-primary);
			border: 1px solid var(--border-primary);

			&:hover:not(:disabled) {
				background-color: var(--bg-tertiary);
				border-color: var(--border-focus);
			}

			&:active:not(:disabled) {
				background-color: var(--bg-secondary);
			}
		}

		&--google {
			background-color: var(--color-white);
			color: var(--color-gray-700);
			border: 1px solid var(--color-gray-300);
			box-shadow: var(--shadow-xs);

			&:hover:not(:disabled) {
				background-color: var(--color-gray-25);
				box-shadow: var(--shadow-sm);
			}

			&:active:not(:disabled) {
				background-color: var(--color-gray-50);
			}
		}

    &.md {
      padding: var(--space-2) var(--space-4);
      font-size: var(--font-size-xs);
    }
    &.sm {
      padding: var(--space-1) var(--space-2);
      font-size: var(--font-size-xs);
    }
	}
</style>
