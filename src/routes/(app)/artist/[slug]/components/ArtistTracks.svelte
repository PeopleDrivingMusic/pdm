<script lang="ts">
	import type { PageData } from '../$types';
	import MusicTrack from '$lib/ui/components/MusicTrack.svelte';
	import ContentSkeleton from './ContentSkeleton.svelte';
	import LoadError from './LoadError.svelte';

	let {
		artist,
		tracks,
		albums
	}: {
		artist: PageData['artist'];
		tracks: PageData['tracks'];
		albums: PageData['albums'];
	} = $props();
</script>

{#await albums}
	<div class="track-wrapper">
		<ContentSkeleton kind="track" count={4} />
	</div>
{:then albumsResolved}
	{@const albumMap = new Map(albumsResolved.map((album) => [album.id, album]))}
	{#await tracks}
		<div class="track-wrapper">
			<ContentSkeleton kind="track" count={4} />
		</div>
	{:then tracksResolved}
		<div class="track-wrapper">
			{#each tracksResolved as trackEntry (trackEntry.track.id)}
				<MusicTrack
					track={trackEntry.track}
					isLiked={trackEntry.isLiked}
					{artist}
					album={albumMap.get(trackEntry.track.albumId || '')}
					locked={trackEntry.locked}
				/>
			{/each}
		</div>
	{:catch}
		<LoadError message="Couldn't load tracks. Refresh to try again." />
	{/await}
{:catch}
	<LoadError message="Couldn't load albums. Refresh to try again." />
{/await}

<style lang="scss">
	.track-wrapper {
		display: grid;
		grid-auto-flow: column;
		gap: var(--space-4);
		overflow-x: auto;
		margin-inline: calc(var(--space-2) * -1);
		padding: var(--space-1) var(--space-2) var(--space-3);
		border-radius: 0;
		background: transparent;
		grid-auto-columns: minmax(280px, 1fr);
		grid-template-rows: repeat(3, auto);
	}
</style>
