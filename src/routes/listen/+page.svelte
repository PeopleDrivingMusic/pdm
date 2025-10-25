<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { PageProps } from './$types';
	import MusicTrack from '$lib/ui/MusicTrack.svelte';
	let { data }: PageProps = $props();
	$inspect(data.tracks);
</script>

<div class="music-wrapper">
	<div class="section">
		<div class="section-bg"></div>
		<h2>Your music</h2>

		<div class="for-you-wrapp">
			{#if data.tracks.length}
				{#each Array(10) as _}
					<MusicTrack
						track={data.tracks[0].tracks}
						album={data.tracks[0].albums}
						artist={data.tracks[0].artists}
					/>
				{/each}
			{/if}
		</div>
	</div>
	<div class="section">
		<div class="section-bg"></div>
		<h2>Recently Played</h2>

		<div class="for-you-wrapp">
			{#if data.tracks.length}
				{#each Array(10) as _}
					<MusicTrack
						track={data.tracks[0].tracks}
						album={data.tracks[0].albums}
						artist={data.tracks[0].artists}
					/>
				{/each}
			{/if}
		</div>
	</div>
	<div class="section">
		<div class="section-bg"></div>
		<h2>Based on your taste</h2>

		<div class="for-you-wrapp">
			{#if data.tracks.length}
				{#each Array(10) as _}
					<MusicTrack
						track={data.tracks[0].tracks}
						album={data.tracks[0].albums}
						artist={data.tracks[0].artists}
					/>
				{/each}
			{/if}
		</div>
	</div>
	<div class="section">
		<div class="section-bg"></div>
		<h2>Explore</h2>

		<div class="for-you-wrapp">
			{#if data.tracks.length}
				{#each Array(10) as _}
					<MusicTrack
						track={data.tracks[0].tracks}
						album={data.tracks[0].albums}
						artist={data.tracks[0].artists}
					/>
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
		gap: var(--space-6);
		.section {
			position: relative;
			border-radius: 24px;
			.section-bg {
				position: absolute;
				left: 0;
				right: 0;
				top: 0;
				bottom: 0;
				background-color: var(--bg-surface);
				opacity: 0.8;
				z-index: 0;
				border-radius: 24px;
			}
			display: flex;
			box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
			flex-direction: column;
			padding: var(--space-4);
			gap: var(--space-4);
			h2 {
				z-index: 1;
				@include text-display-xs();
			}

			.for-you-wrapp {
				z-index: 1;
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
