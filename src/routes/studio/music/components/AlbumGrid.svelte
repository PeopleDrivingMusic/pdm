<script lang="ts">
	import { mdiAlbum } from '@mdi/js';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import Button from '$lib/ui/Button.svelte';
	import AlbumCard from './AlbumCard.svelte';
	import type { AlbumDTO, AlbumTrackDTO } from '$lib/server/music';

	let {
		albums,
		albumTracks,
		trackTitles,
		onEdit,
		onDelete,
		onUnlinkTrack,
		onCreate
	}: {
		albums: AlbumDTO[];
		albumTracks: AlbumTrackDTO[];
		trackTitles: Record<string, string>;
		onEdit: (album: AlbumDTO) => void;
		onDelete: (album: AlbumDTO) => void;
		onUnlinkTrack: (albumId: string, trackId: string) => void;
		onCreate: () => void;
	} = $props();

	function linkedFor(albumId: string) {
		return albumTracks
			.filter((at) => at.albumId === albumId)
			.map((at) => ({
				trackId: at.trackId,
				trackNumber: at.trackNumber,
				title: trackTitles[at.trackId] ?? 'Untitled'
			}))
			.sort((a, b) => a.trackNumber - b.trackNumber);
	}
</script>

{#if albums.length === 0}
	<div class="empty">
		<SvgIcon path={mdiAlbum} size={44} />
		<p>No albums yet</p>
		<Button onClick={onCreate}>Create your first album</Button>
	</div>
{:else}
	<div class="grid">
		{#each albums as album (album.id)}
			<AlbumCard {album} linkedTracks={linkedFor(album.id)} {onEdit} {onDelete} {onUnlinkTrack} />
		{/each}
	</div>
{/if}

<style lang="scss">
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-6);

		@media (max-width: 768px) {
			grid-template-columns: 1fr;
		}
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-12) var(--space-8);
		border: 2px dashed var(--border-primary);
		border-radius: var(--radius-lg);
		background: var(--bg-secondary);
		color: var(--text-tertiary);
		text-align: center;

		p {
			margin: 0;
			color: var(--text-secondary);
		}
	}
</style>
