<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { PageProps } from './$types';
	import MusicTrack from '$lib/ui/MusicTrack.svelte';
	let { data }: PageProps = $props();
	$inspect(data.tracks);
</script>

<div class="music-wrapper">
	<div class="section">
		<h2>Your music</h2>

		<div class="for-you-wrapp">
			{#if data.tracks.length}
			{#each Array(10) as _}
				<MusicTrack track={data.tracks[0].tracks} album={data.tracks[0].albums}  artist={data.tracks[0].artists}/>
				 <!-- content here -->
			{/each}
			{/if}
		</div>
	</div>
	<div class="section">
		<h2>Recently Played</h2>

		<div class="for-you-wrapp">
			{#if data.tracks.length}
			{#each Array(10) as _}
				<MusicTrack track={data.tracks[0].tracks} album={data.tracks[0].albums}  artist={data.tracks[0].artists}/>
				 <!-- content here -->
			{/each}
			{/if}
		</div>
	</div>
	<div class="section">
		<h2>Based on your taste</h2>

		<div class="for-you-wrapp">
			{#if data.tracks.length}
			{#each Array(10) as _}
				<MusicTrack track={data.tracks[0].tracks} album={data.tracks[0].albums}  artist={data.tracks[0].artists}/>
				 <!-- content here -->
			{/each}
			{/if}
		</div>
	</div>
	<div class="section">
		<h2>Explore</h2>

		<div class="for-you-wrapp">
			{#if data.tracks.length}
			{#each Array(10) as _}
				<MusicTrack track={data.tracks[0].tracks} album={data.tracks[0].albums}  artist={data.tracks[0].artists}/>
				 <!-- content here -->
			{/each}
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.music-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--space-16);
		.section {
			display: flex;
			flex-direction: column;
			gap: var(--space-4);
			h2 {
				@include text-display-xs();
			}

			.for-you-wrapp {
				display: grid;
				grid-auto-flow: column;
				overflow-x: scroll;
				overflow-y: hidden;
				grid-auto-columns: minmax(300px, 1fr);
				grid-template-rows: repeat(3, auto);
				gap: var(--space-5);
			}
		}
	}
</style>
