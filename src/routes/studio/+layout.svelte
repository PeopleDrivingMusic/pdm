<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import NotificationContainer from '$lib/ui/NotificationContainer.svelte';
	import { mdiMusicNoteEighth, mdiVideoBox } from '@mdi/js/mdi.js';
	import '../../app.scss';
	import type { Snapshot } from './$types';

	let { children, data } = $props();
	export const snapshot: Snapshot<boolean> = {
		capture: () => sidebarExpand,
		restore: (value) => (sidebarExpand = value)
	};
	let sidebarExpand = $state(true);

	const sidebarItems = [
		{ label: 'Music', icon: mdiMusicNoteEighth, href: '/studio/music' },
		{ label: 'Content', icon: mdiVideoBox, href: '/studio/content' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<div class="app-wrapper">
	<Sidebar
		bind:expand={sidebarExpand}
		items={sidebarItems}
		showSearch={false}
		account={data.artist
			? {
					name: data.artist.name,
					avatarUrl: data.artist.avatar,
					profileHref: data.artist.slug ? `/artist/${data.artist.slug}` : undefined
				}
			: null}
	/>
	<div class="page">
		{@render children?.()}
	</div>
</div>

<NotificationContainer />

<style lang="scss">
	.app-wrapper {
		max-width: 100vw;
		width: 100vw;
		height: 100vh;
		display: flex;
		background: var(--bg-secondary);
		color: var(--text-primary);
		padding-top: 20px;
		transition:
			max-height 300ms ease,
			height 300ms ease;

		.page {
			flex: 1;
			overflow-y: auto;
			height: 100%;
			border-top-left-radius: 24px;
			background: var(--bg-primary);
			background-position: center;
			background-size: contain;
			box-shadow: var(--shadow-sm);
		}
	}
</style>
