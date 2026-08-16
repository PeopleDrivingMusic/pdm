<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../../app.scss';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<div class="app-wrapper">
	<div class="page">
		{@render children?.()}
	</div>
</div>

<style lang="scss">
	.app-wrapper {
		max-width: 100vw;
		width: 100vw;
		max-height: calc(100vh - 76px - var(--space-2));
		height: 100vh;
		display: flex;
		background: var(--bg-secondary);
		color: var(--text-primary);
		padding-top: 20px;
		transition:
			max-height 300ms ease,
			height 300ms ease;

		&.fullHeight {
			max-height: 100vh;
		}

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
		}
	}
</style>
