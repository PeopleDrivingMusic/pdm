<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { mdiHome, mdiMusicNoteEighth } from '@mdi/js/mdi.js';
	import { playerStore } from '$lib/stores/player.svelte';
	import MusicPlayer from '$lib/ui/components/MusicPlayer/MusicPlayer.svelte';
	import '../../app.scss';
	import type { Snapshot } from '../$types';

	let { children, data } = $props();
	export const snapshot: Snapshot<boolean> = {
		capture: () => sidebarExpand,
		restore: (value) => (sidebarExpand = value)
	};
	let sidebarExpand = $state(true);

	const sidebarItems = [
		{ label: 'Home', icon: mdiHome, href: '/' },
		{ label: 'Music', icon: mdiMusicNoteEighth, href: '/listen' },
		{ space: true },
		{ section: true }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<div class="app-wrapper" class:fullHeight={playerStore.currentTrackIndex < 0}>
	<Sidebar
		bind:expand={sidebarExpand}
		items={sidebarItems}
		showSearch={true}
		account={data.user
			? {
					name: data.user.displayName || data.user.username || 'User',
					avatarUrl: data.user.avatarUrl,
					profileHref: data.user.username ? `/profile/${data.user.username}` : '/profile'
				}
			: null}
	/>
	<div class="page">
		{@render children?.()}
	</div>
</div>
{#if playerStore.currentTrackIndex > -1}
	<MusicPlayer />
{/if}

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
