<script lang="ts">
	import type { ContentVisibility } from '$lib/db/content-visibility';
	import { mdiMusicNote } from '@mdi/js';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import Button from '$lib/ui/Button.svelte';
	import TrackRow from './TrackRow.svelte';
	import type { TrackDTO, TrackStatsDTO, AlbumTrackDTO } from '$lib/server/music';
	import type { TrackUploadJob } from '$lib/studio/music/types';

	let {
		tracks,
		albumTracks = [],
		albumTitles = {},
		albumVisibility = {},
		jobsById = {},
		onEdit,
		onDelete,
		onLink,
		onVisibilityChange,
		onRetry,
		onUpload
	}: {
		tracks: { track: TrackDTO; stats: TrackStatsDTO | null }[];
		albumTracks?: AlbumTrackDTO[];
		albumTitles?: Record<string, string>;
		albumVisibility?: Record<string, ContentVisibility>;
		jobsById?: Record<string, TrackUploadJob>;
		onEdit: (t: TrackDTO) => void;
		onDelete: (t: TrackDTO) => void;
		onLink: (t: TrackDTO) => void;
		onVisibilityChange: (t: TrackDTO, v: ContentVisibility) => void;
		onRetry: (trackId: string) => void;
		onUpload: () => void;
	} = $props();

	function albumsFor(trackId: string) {
		return albumTracks
			.filter((at) => at.trackId === trackId)
			.map((at) => albumTitles[at.albumId])
			.filter(Boolean) as string[];
	}
	function inheritedFrom(trackId: string): 'album' | null {
		return albumTracks.some(
			(at) => at.trackId === trackId && albumVisibility[at.albumId] === 'subscribers'
		)
			? 'album'
			: null;
	}
</script>

<section class="panel">
	<header class="ph">
		<h2>Tracks</h2>
		<span class="count">{tracks.length} total</span>
	</header>

	{#if tracks.length === 0}
		<div class="empty">
			<SvgIcon path={mdiMusicNote} size={40} />
			<p>No tracks yet</p>
			<Button onClick={onUpload}>Upload your first track</Button>
		</div>
	{:else}
		<ul class="rows">
			{#each tracks as { track }, i (track.id)}
				<TrackRow
					{track}
					index={i + 1}
					albumTitles={albumsFor(track.id)}
					inheritedFrom={inheritedFrom(track.id)}
					job={jobsById[track.id] ?? null}
					{onEdit}
					{onDelete}
					{onLink}
					{onVisibilityChange}
					{onRetry}
				/>
			{/each}
		</ul>
	{/if}
</section>

<style lang="scss">
	.panel {
		background: var(--bg-surface);
		border: 1px solid var(--border-primary);
		border-radius: 20px;
		overflow: hidden;
	}
	.ph {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 22px 26px 14px;
		h2 {
			margin: 0;
			font-family: var(--font-serif);
			font-size: 26px;
			font-weight: 700;
			color: var(--text-primary);
		}
		.count {
			color: var(--text-tertiary);
			font-size: 13px;
		}
	}
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-12) var(--space-8);
		color: var(--text-tertiary);
		text-align: center;
		p {
			margin: 0;
			color: var(--text-secondary);
		}
	}
</style>
