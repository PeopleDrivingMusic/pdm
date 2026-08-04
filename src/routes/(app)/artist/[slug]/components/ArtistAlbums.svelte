<script lang="ts">
	import type { PageData } from '../$types';
	import MusicAlbum from '$lib/ui/components/MusicAlbum.svelte';
	import ContentSkeleton from './ContentSkeleton.svelte';
	import LoadError from './LoadError.svelte';

	let {
		artist,
		albums
	}: {
		artist: PageData['artist'];
		albums: PageData['albums'];
	} = $props();
</script>

{#await albums}
	<div class="album-wrapper">
		<ContentSkeleton kind="album" count={4} />
	</div>
{:then albumsResolved}
	<div class="album-wrapper">
		{#each albumsResolved as album (album.id)}
			<MusicAlbum {album} {artist} />
		{/each}
	</div>
{:catch}
	<LoadError message="Couldn't load albums. Refresh to try again." />
{/await}

<style lang="scss">
	.album-wrapper {
		display: grid;
		grid-auto-flow: column;
		gap: var(--space-4);
		overflow-x: auto;
		margin-inline: calc(var(--space-2) * -1);
		padding: var(--space-1) var(--space-2) var(--space-3);
		border-radius: 0;
		background: transparent;
		grid-auto-columns: minmax(180px, 220px);
	}
</style>
