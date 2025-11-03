<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';

	interface Tab {
		id: string;
		label: string;
		[key: string]: any;
	}
	interface TabsProps {
		tabs: Array<Tab>;
		activeTab: Tab;
		showTrack?: boolean;
		type?: 'underline' | 'pill' | 'button';
		onTabChange?: (tab: Tab) => void;
	}
	let borderNode: HTMLDivElement;
	let wrapperNode: HTMLDivElement;
	let trackNode: HTMLDivElement;
	let {
		tabs,
		type = 'button',
		showTrack = false,
		activeTab = $bindable(),
		onTabChange
	}: TabsProps = $props();

	$effect(() => {
		if (wrapperNode && trackNode) {
			trackNode.style.width = `${wrapperNode.scrollWidth}px`;
		}
	});

	$effect(() => {
		const resizeObserver = new ResizeObserver(() => {
			untrack(() => updateBorder(activeTab));
		});

		if (wrapperNode) {
			resizeObserver.observe(wrapperNode);
		}

		return () => {
			resizeObserver.disconnect();
		};
	});

	$effect(() => {
		if (borderNode && wrapperNode) updateBorder(activeTab);
	});

	function updateBorder(activeTab: Tab) {
		const activeTabElement = wrapperNode.querySelector(
			`button[data-tab-id="${activeTab.id}"]`
		) as HTMLElement;
		if (activeTabElement && borderNode && wrapperNode) {
			const rect = activeTabElement.getBoundingClientRect();
			const parentRect = wrapperNode.getBoundingClientRect();

			const scrollLeft = wrapperNode.scrollLeft;
			const offsetLeft = rect.left - parentRect.left + scrollLeft;

			borderNode.style.width = `${rect.width}px`;
			borderNode.style.transform = `translateX(${offsetLeft}px)`;
		}
	}

	function click(tab: Tab) {
		activeTab = tab;
		onTabChange?.(tab);
	}

	onMount(() => {
		updateBorder(activeTab);
	});

	async function handleResize() {
		updateBorder(activeTab);
	}
</script>

<svelte:window onresize={handleResize} />
<div class="tabs-wrapper {type}" bind:this={wrapperNode}>
	{#each tabs as tab}
		<button
			data-tab-id={tab.id}
			class="tab {tab.id === activeTab.id ? 'active' : ''}"
			onclick={() => click(tab)}
		>
			{tab.label}
		</button>
	{/each}
	{#if showTrack && type === 'underline'}
		<div class="tab-track" bind:this={trackNode}></div>
	{/if}
	<div class="tab-border" bind:this={borderNode}></div>
</div>

<style lang="scss">
	.tabs-wrapper {
		display: flex;
		width: 100%;
		max-width: 100%;
		overflow-x: auto;
		position: relative;

		.tab {
			flex-grow: 1;
			flex-shrink: 0;
			background: transparent;
			border: none;
			padding: var(--space-3);
			font-size: var(--font-size-4);
			color: var(--text-secondary);
			cursor: pointer;
			white-space: nowrap;
			transition:
				color 200ms ease-in-out,
				border-bottom 200ms ease-in-out;

			&.active {
				color: var(--text-primary);
				border-bottom: 2px solid var(--accent-primary);
			}

			&:hover {
				color: var(--text-primary);
			}
		}
		.tab-border {
			position: absolute;
			bottom: 0;
			width: 0;
			height: 2px;
			transition: all 300ms ease-out;
			transform: translateX(0);
			background: var(--primary);
			left: 0;
			z-index: 1;
		}
		.tab-track {
			position: absolute;
			bottom: 0;
			left: 0;
			width: 100%;
			height: 2px;
			background: var(--bg-tertiary);
		}

		&.pill,
		&.button {
			.tab {
				z-index: 1;
				min-width: 70px;
				padding-inline: var(--space-3);
				padding-block: var(--space-2);
			}
			.tab-border {
				z-index: 0;
				bottom: unset;
				top: 0;
				height: 100%;
				border-radius: 24px;
				background: var(--primary);
			}
		}

		&.button {
			.tab-border {
				border-radius: var(--radius-md);
			}
		}
	}
</style>
