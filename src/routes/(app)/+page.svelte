<script lang="ts">
	import MusicTrack from '$lib/ui/components/MusicTrack.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>PDM</title>
</svelte:head>

<section class="home">
	<header class="home__header">
		<h1>Listen</h1>
		<p>Music from artists on PDM.</p>
	</header>

	{#if data.tracks.length}
		<div class="home__grid">
			{#each data.tracks as row (row.tracks.id)}
				<MusicTrack
					track={row.tracks}
					album={row.albums}
					artist={row.artists}
					isLiked={row.isLiked}
				/>
			{/each}
		</div>
	{:else}
		<p class="home__empty">No tracks yet.</p>
	{/if}
</section>

<style lang="scss">
	.home {
		padding: var(--space-8);
		display: flex;
		flex-direction: column;
		gap: var(--space-6);

		&__header {
			display: flex;
			flex-direction: column;
			gap: var(--space-1);

			h1 {
				color: var(--text-primary);
			}

			p {
				@include text-sm();
				color: var(--text-secondary);
			}
		}

		&__grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
			gap: var(--space-4);
		}

		&__empty {
			@include text-sm();
			color: var(--text-tertiary);
		}
	}
</style>
