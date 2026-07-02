<script lang="ts">
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
		albumVisibility?: Record<string, 'public' | 'subscribers_only'>;
		jobsById?: Record<string, TrackUploadJob>;
		onEdit: (t: TrackDTO) => void;
		onDelete: (t: TrackDTO) => void;
		onLink: (t: TrackDTO) => void;
		onVisibilityChange: (t: TrackDTO, v: 'public' | 'subscribers_only') => void;
		onRetry: (trackId: string) => void;
		onUpload: () => void;
	} = $props();

	function albumsFor(trackId: string) {
		return albumTracks
			.filter((at) => at.trackId === trackId)
			.map((at) => albumTitles[at.albumId])
			.filter(Boolean) as string[];
	}
	// A track is "inherited" when it belongs to a subscribers-only album.
	function inheritedFrom(trackId: string): 'album' | null {
		const gated = albumTracks.some(
			(at) => at.trackId === trackId && albumVisibility[at.albumId] === 'subscribers_only'
		);
		return gated ? 'album' : null;
	}
</script>

{#if tracks.length === 0}
	<div class="empty">
		<SvgIcon path={mdiMusicNote} size={44} />
		<p>No tracks yet</p>
		<Button onClick={onUpload}>Upload your first track</Button>
	</div>
{:else}
	<div class="table-scroll">
		<div class="thead" aria-hidden="true">
			<span></span>
			<span>Title</span>
			<span class="r">Time</span>
			<span>Visibility</span>
			<span>Status</span>
			<span>Plays · Likes · Saves</span>
			<span></span>
		</div>
		<ul class="track-list">
			{#each tracks as { track, stats } (track.id)}
				<TrackRow
					{track}
					{stats}
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
	</div>
{/if}

<style lang="scss">
	.table-scroll {
		overflow-x: auto;
	}

	.thead {
		display: grid;
		grid-template-columns: 48px minmax(0, 2fr) 56px auto auto auto auto;
		align-items: center;
		gap: var(--space-3);
		padding: 0 var(--space-4) var(--space-2);
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-tertiary);

		.r {
			text-align: right;
		}

		@media (max-width: 900px) {
			display: none;
		}
	}

	.track-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
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
