<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import '../app.scss';
	import type { Snapshot } from './$types';

	let { children } = $props();
	export const snapshot: Snapshot<boolean> = {
		capture: () => sidebarExpand,
		restore: (value) => (sidebarExpand = value)
	};
	let sidebarExpand = $state(true)
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<div class="app-wrapper">
	<Sidebar bind:expand={sidebarExpand} />
	<div class="page">
		{@render children?.()}
	</div>
</div>

<style lang="scss">
	.app-wrapper {
		max-width: 100vw;
		width: 100vw;
		max-height: 100vh;
		height: 100vh;
		display: flex;
		background: var(--bg-secondary);
		color: var(--text-primary);
		padding-top: 20px;
		
		.page {
			flex: 1;
			overflow-y: auto;
			height: 100%;
			border-top-left-radius: 24px;
			background: var(--bg-primary);
			// background-image: url("/bg1.jpg");
			background-position: center;
			background-size: contain;
			box-shadow: var(--shadow-sm);
			padding-block: var(--space-6);
			padding-inline: var(--space-10);
		}
	}
</style>
