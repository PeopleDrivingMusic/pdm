<script lang="ts">
	import { mdiUpload } from '@mdi/js';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import Button from '$lib/ui/Button.svelte';
	import AlbumTile from './AlbumTile.svelte';
	import type { AlbumDTO, AlbumTrackDTO, StudioStatsDTO } from '$lib/server/music';

	let {
		albums,
		albumTracks,
		stats,
		onEdit,
		onDelete,
		onCreate,
		onFiles
	}: {
		albums: AlbumDTO[];
		albumTracks: AlbumTrackDTO[];
		stats: StudioStatsDTO;
		onEdit: (a: AlbumDTO) => void;
		onDelete: (a: AlbumDTO) => void;
		onCreate: () => void;
		onFiles: (files: File[]) => void;
	} = $props();

	let dragOver = $state(false);
	let fileInput: HTMLInputElement;

	function count(albumId: string) {
		return albumTracks.filter((at) => at.albumId === albumId).length;
	}
	const featured = $derived(albums[0] ?? null);
	const rest = $derived(albums.slice(1));

	function acceptAudio(list: FileList | null) {
		if (!list) return;
		const files = Array.from(list).filter((f) => f.type.startsWith('audio/'));
		if (files.length) onFiles(files);
	}
	const fmt = (n: number) => n.toLocaleString();
</script>

<div class="bento">
	{#if featured}
		<AlbumTile
			album={featured}
			featured
			index={1}
			trackCount={count(featured.id)}
			{onEdit}
			{onDelete}
		/>
	{/if}

	<!-- Stats tile -->
	<section class="tile stats">
		<div class="big">{fmt(stats.totalTracks)}</div>
		<div class="lbl">Tracks</div>
		<div class="split">
			<div>
				<div class="v">{fmt(stats.subscribersOnly)}</div>
				<div class="lbl">Sub-only</div>
			</div>
			<div>
				<div class="v">{fmt(stats.totalAlbums)}</div>
				<div class="lbl">Albums</div>
			</div>
		</div>
	</section>

	<!-- Upload tile -->
	<button
		type="button"
		class="tile upload"
		class:drag={dragOver}
		onclick={() => fileInput.click()}
		ondragenter={(e) => (e.preventDefault(), (dragOver = true))}
		ondragover={(e) => e.preventDefault()}
		ondragleave={() => (dragOver = false)}
		ondrop={(e) => (
			e.preventDefault(),
			(dragOver = false),
			acceptAudio(e.dataTransfer?.files ?? null)
		)}
	>
		<span class="ico"><SvgIcon path={mdiUpload} size={22} /></span>
		<span class="u1">Drop audio to upload</span>
		<span class="u2">or click to browse</span>
		<input
			bind:this={fileInput}
			type="file"
			accept="audio/*"
			multiple
			hidden
			onchange={(e) => {
				acceptAudio((e.currentTarget as HTMLInputElement).files);
				(e.currentTarget as HTMLInputElement).value = '';
			}}
		/>
	</button>

	{#each rest as album (album.id)}
		<AlbumTile {album} trackCount={count(album.id)} {onEdit} {onDelete} />
	{/each}

	{#if albums.length === 0}
		<div class="empty-note">
			<p>No albums yet — drop tracks above, or</p>
			<Button onClick={onCreate}>Create your first album</Button>
		</div>
	{/if}
</div>

<style lang="scss">
	.bento {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		grid-auto-rows: 176px;
		grid-auto-flow: dense;
		gap: 18px;

		@media (max-width: 1024px) {
			grid-template-columns: repeat(3, 1fr);
		}
		@media (max-width: 680px) {
			grid-template-columns: repeat(2, 1fr);
			grid-auto-rows: 150px;
		}
	}

	.tile {
		border-radius: 18px;
		border: 1px solid var(--border-primary);
		overflow: hidden;
	}

	.stats {
		background: var(--bg-surface);
		padding: 20px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		font-variant-numeric: tabular-nums;

		.big {
			font-size: 40px;
			font-weight: 800;
			letter-spacing: -0.02em;
			line-height: 1;
		}
		.v {
			font-size: 24px;
			font-weight: 800;
			letter-spacing: -0.02em;
		}
		.lbl {
			font-size: 11px;
			text-transform: uppercase;
			letter-spacing: 0.08em;
			color: var(--text-tertiary);
			margin-top: 3px;
		}
		.split {
			display: flex;
			gap: 26px;
		}
	}

	.upload {
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		text-align: center;
		padding: 16px;
		color: var(--text-secondary);
		border: 1.5px dashed #37373f;
		background:
			radial-gradient(100% 130% at 100% 0%, rgba(255, 178, 0, 0.08), transparent 60%),
			var(--bg-surface);
		transition:
			border-color var(--duration-fast),
			background var(--duration-fast);

		&.drag {
			border-color: var(--dropzone-active-border);
			background: var(--bg-secondary);
		}
		&:focus-visible {
			outline: 2px solid var(--border-focus);
			outline-offset: 2px;
		}
		.ico {
			width: 44px;
			height: 44px;
			border-radius: 12px;
			background: var(--gate-tint-bg);
			color: var(--gate-tint-text);
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.u1 {
			font-weight: 700;
			font-size: 15px;
			color: var(--text-primary);
		}
		.u2 {
			font-size: 12px;
			color: var(--text-tertiary);
		}
	}

	.empty-note {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-8);
		color: var(--text-secondary);
		p {
			margin: 0;
		}
	}
</style>
