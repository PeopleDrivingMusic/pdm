<script lang="ts">
	import SvgIcon from './SvgIcon.svelte';

	interface Props {
		path: string;
		label: string;
		type?: 'button' | 'submit' | 'reset';
		active?: boolean;
		disabled?: boolean;
		onClick?: () => void;
	}

	let { path, label, type = 'button', active = false, disabled = false, onClick }: Props = $props();
</script>

<button
	{type}
	class="icon-button"
	class:icon-button--active={active}
	{disabled}
	aria-label={label}
	title={label}
	onclick={onClick}
>
	<SvgIcon {path} size={18} />
</button>

<style lang="scss">
	.icon-button {
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

	.icon-button--active {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--text-on-primary);
	}
</style>
