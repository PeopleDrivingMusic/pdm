<script lang="ts">
	import { mdiDotsVertical } from '@mdi/js';
	import SvgIcon from './SvgIcon.svelte';

	export interface MenuItem {
		key: string;
		label: string;
		icon: string;
		danger?: boolean;
	}

	/**
	 * A trigger + positioned item list: kebab button opens a small overflow
	 * menu, closes on an outside click or Escape (returning focus to the
	 * trigger), and reports the chosen item by key. Self-contained on purpose —
	 * placing several in a list (e.g. one per row) "just works": opening one
	 * closes any other, since each closes itself on any click outside its own
	 * wrapper, including a click on another trigger.
	 */
	let {
		label,
		items,
		onSelect
	}: {
		/** aria-label for the trigger button, e.g. "More actions". */
		label: string;
		items: MenuItem[];
		onSelect: (key: string) => void;
	} = $props();

	let open = $state(false);
	let trigger = $state<HTMLButtonElement | null>(null);
	let wrap = $state<HTMLDivElement | null>(null);

	function close(restoreFocus = false) {
		open = false;
		if (restoreFocus) trigger?.focus();
	}

	$effect(() => {
		if (!open) return;
		const onClick = (event: MouseEvent) => {
			// `.closest('.menu-wrap')` would match *any* Menu's wrapper, not just
			// this one — with two on a page, clicking the second one's trigger
			// counts as "inside a menu-wrap" and never closes the first. Checking
			// against this instance's own element is what actually scopes it.
			const target = event.target as Node | null;
			if (!wrap?.contains(target)) open = false;
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') close(true);
		};
		document.addEventListener('click', onClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onClick);
			document.removeEventListener('keydown', onKey);
		};
	});

	function select(item: MenuItem) {
		open = false;
		onSelect(item.key);
	}
</script>

<div class="menu-wrap" bind:this={wrap}>
	<button
		type="button"
		class="menu-trigger"
		bind:this={trigger}
		aria-label={label}
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		<SvgIcon path={mdiDotsVertical} size={16} />
	</button>

	{#if open}
		<div class="menu">
			{#each items as item (item.key)}
				<button type="button" class:danger={item.danger} onclick={() => select(item)}>
					<SvgIcon path={item.icon} size={16} />
					<span>{item.label}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	.menu-wrap {
		position: relative;
		display: inline-flex;
	}

	.menu-trigger {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;

		// The visual button stays compact; the tap area is extended to 44px.
		&::after {
			content: '';
			position: absolute;
			inset: -8px;
		}

		&:hover,
		&[aria-expanded='true'] {
			color: var(--text-primary);
			background: color-mix(in srgb, var(--bg-surface) 78%, transparent);
		}
	}

	.menu {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		z-index: 30;
		min-width: 170px;
		padding: var(--space-1);
		display: flex;
		flex-direction: column;
		border: 1px solid color-mix(in srgb, var(--border-primary) 62%, transparent);
		border-radius: var(--radius-md);
		background: var(--bg-surface);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.32);

		button {
			display: flex;
			align-items: center;
			gap: var(--space-2);
			width: 100%;
			min-height: 40px;
			padding: 0 var(--space-2);
			border: none;
			border-radius: var(--radius-sm, 6px);
			background: transparent;
			color: var(--text-primary);
			font: inherit;
			font-size: var(--font-size-sm);
			text-align: left;
			cursor: pointer;

			&:hover {
				background: color-mix(in srgb, var(--bg-primary) 60%, transparent);
			}

			&.danger {
				color: var(--error, #e5484d);
			}
		}
	}
</style>
