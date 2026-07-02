<script lang="ts">
	import { mdiAlbum, mdiMusicNote, mdiPlay, mdiHeart, mdiContentSave, mdiLock } from '@mdi/js';
	import StatCard from '$lib/ui/StatCard.svelte';
	import type { StudioStatsDTO } from '$lib/server/music';

	let { stats }: { stats: StudioStatsDTO } = $props();

	const fmt = (n: number) => n.toLocaleString();
</script>

<div class="stats-bar">
	<StatCard label="Albums" value={fmt(stats.totalAlbums)} icon={mdiAlbum} />
	<StatCard label="Tracks" value={fmt(stats.totalTracks)} icon={mdiMusicNote} />
	<StatCard label="Plays" value={fmt(stats.totalPlays)} icon={mdiPlay} />
	<StatCard label="Likes" value={fmt(stats.totalLikes)} icon={mdiHeart} />
	<StatCard label="Saves" value={fmt(stats.totalSaves)} icon={mdiContentSave} />
	<StatCard label="Subscriber-only" value={fmt(stats.subscribersOnly)} icon={mdiLock} />
</div>

<style lang="scss">
	.stats-bar {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: var(--space-4);
		font-variant-numeric: tabular-nums;

		@media (max-width: 1280px) {
			grid-template-columns: repeat(3, 1fr);
		}
		@media (max-width: 768px) {
			grid-template-columns: repeat(2, 1fr);
		}
		@media (max-width: 480px) {
			grid-template-columns: 1fr;
		}
	}
</style>
