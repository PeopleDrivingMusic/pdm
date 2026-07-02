<script lang="ts">
	import {
		mdiMusicNote,
		mdiPencil,
		mdiDelete,
		mdiLink,
		mdiRefresh,
		mdiUpload,
		mdiLock,
		mdiEarth
	} from '@mdi/js';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import Badge from '$lib/ui/Badge.svelte';
	import ProgressBar from '$lib/ui/ProgressBar.svelte';
	import { resolveR2ImageUrl } from '$lib/utils/helpers';
	import type { TrackDTO, TrackStatsDTO } from '$lib/server/music';
	import type { TrackUploadJob } from '$lib/studio/music/types';

	let {
		track,
		stats = null,
		albumTitles = [],
		inheritedFrom = null,
		job = null,
		onEdit,
		onDelete,
		onLink,
		onVisibilityChange,
		onRetry
	}: {
		track: TrackDTO;
		stats?: TrackStatsDTO | null;
		albumTitles?: string[];
		inheritedFrom?: 'album' | null;
		job?: TrackUploadJob | null;
		onEdit: (t: TrackDTO) => void;
		onDelete: (t: TrackDTO) => void;
		onLink: (t: TrackDTO) => void;
		onVisibilityChange: (t: TrackDTO, v: 'public' | 'subscribers_only') => void;
		onRetry: (trackId: string) => void;
	} = $props();

	const uploading = $derived(
		job?.state === 'uploading' ||
			job?.state === 'finalizing' ||
			(!job && (track.status === 'pending_upload' || track.status === 'processing'))
	);
	const failed = $derived(job?.state === 'failed' || track.status === 'failed');
	const coverSrc = $derived(
		job?.coverPreviewUrl ?? (uploading ? null : resolveR2ImageUrl(track.imageKey))
	);

	function fmtDuration(sec: number | null) {
		if (!sec) return '--:--';
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}
	const statusLabel = $derived(
		job?.state === 'finalizing'
			? 'Verifying'
			: uploading
				? `Uploading ${Math.round(job?.progress ?? 0)}%`
				: failed
					? 'Upload failed'
					: track.isPublished
						? 'Published'
						: 'Draft'
	);
	const statusVariant = $derived(
		uploading ? 'uploading' : failed ? 'failed' : track.isPublished ? 'published' : 'draft'
	);
</script>

<li class="track-row" class:busy={uploading} class:failed>
	<div class="cover" class:dim={uploading || failed}>
		{#if coverSrc}
			<img src={coverSrc} alt={track.title} loading="lazy" />
		{:else}
			<div class="cover-ph"><SvgIcon path={mdiMusicNote} size={18} /></div>
		{/if}
		{#if uploading}
			<span class="cover-overlay" aria-hidden="true"><SvgIcon path={mdiUpload} size={16} /></span>
		{:else if failed}
			<button
				type="button"
				class="cover-overlay retry"
				title="Retry upload"
				aria-label={`Retry upload for ${track.title}`}
				onclick={() => onRetry(track.id)}
			>
				<SvgIcon path={mdiRefresh} size={16} />
			</button>
		{/if}
	</div>

	<div class="main">
		<span class="title">{track.title}</span>
		<span class="sub">
			{#if albumTitles.length > 0}<span class="albums">{albumTitles.join(', ')}</span>{/if}
		</span>
		{#if uploading && job}
			<span class="progress"
				><ProgressBar value={job.progress} label={`Uploading ${track.title}`} /></span
			>
		{/if}
	</div>

	<span class="dur">{fmtDuration(track.duration)}</span>

	<span class="gate">
		<button
			type="button"
			class="gate-toggle"
			class:on={track.visibility === 'subscribers_only'}
			title={inheritedFrom
				? 'Subscribers-only (inherited from album) — click to override'
				: track.visibility === 'subscribers_only'
					? 'Subscribers-only — click to make public'
					: 'Public — click to make subscribers-only'}
			aria-pressed={track.visibility === 'subscribers_only'}
			onclick={() =>
				onVisibilityChange(
					track,
					track.visibility === 'subscribers_only' ? 'public' : 'subscribers_only'
				)}
		>
			{#if track.visibility === 'subscribers_only'}
				<Badge
					variant="gate"
					label={inheritedFrom ? 'Subscribers*' : 'Subscribers'}
					icon={mdiLock}
				/>
			{:else}
				<span class="gate-public"><SvgIcon path={mdiEarth} size={14} /> Public</span>
			{/if}
		</button>
	</span>

	<span class="status">
		<Badge variant={statusVariant} label={statusLabel} />
	</span>

	<span class="stats" aria-label="engagement">
		<span title="Plays">{stats?.playCount ?? 0}</span>
		<span title="Likes">{stats?.likeCount ?? 0}</span>
		<span title="Saves">{stats?.saveCount ?? 0}</span>
	</span>

	<span class="actions">
		<button type="button" class="icon-btn" title="Link to album" onclick={() => onLink(track)}>
			<SvgIcon path={mdiLink} size={16} />
		</button>
		<button type="button" class="icon-btn" title="Edit track" onclick={() => onEdit(track)}>
			<SvgIcon path={mdiPencil} size={16} />
		</button>
		<button
			type="button"
			class="icon-btn danger"
			title="Delete track"
			onclick={() => onDelete(track)}
		>
			<SvgIcon path={mdiDelete} size={16} />
		</button>
	</span>
</li>

<style lang="scss">
	.track-row {
		display: grid;
		grid-template-columns: 48px minmax(0, 2fr) 56px auto auto auto auto;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background: var(--bg-surface);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-md);
		transition:
			background var(--duration-fast),
			border-color var(--duration-fast);

		&:hover {
			background: var(--bg-secondary);
			border-color: var(--border-secondary, var(--border-focus));
		}
		&:focus-within {
			border-color: var(--border-focus);
		}
	}

	.cover {
		position: relative;
		width: 48px;
		height: 48px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--bg-tertiary);
		flex-shrink: 0;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}
		.cover-ph {
			width: 100%;
			height: 100%;
			display: flex;
			align-items: center;
			justify-content: center;
			color: var(--text-tertiary);
		}
		&.dim img,
		&.dim .cover-ph {
			filter: brightness(0.55);
		}
		.cover-overlay {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			background: var(--upload-overlay);
			color: #fff;
			border: 0;
			cursor: default;
		}
		.cover-overlay.retry {
			cursor: pointer;
			&:focus-visible {
				outline: 2px solid var(--border-focus);
			}
		}
	}

	.main {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;

		.title {
			font-size: var(--font-size-base);
			font-weight: var(--font-weight-medium);
			color: var(--text-primary);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.sub {
			font-size: var(--font-size-xs);
			color: var(--text-tertiary);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.progress {
			margin-top: var(--space-1);
			display: block;
			max-width: 220px;
		}
	}

	.dur {
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.gate-toggle {
		border: 0;
		background: transparent;
		padding: 0;
		cursor: pointer;
		display: inline-flex;
		border-radius: var(--radius-sm);

		&:focus-visible {
			outline: 2px solid var(--border-focus);
			outline-offset: 2px;
		}
		.gate-public {
			display: inline-flex;
			align-items: center;
			gap: var(--space-1);
			font-size: var(--font-size-xs);
			color: var(--text-tertiary);
			padding: var(--space-1) var(--space-2);
			border-radius: var(--radius-sm);
		}
		&:hover .gate-public {
			color: var(--text-secondary);
			background: var(--bg-tertiary);
		}
	}

	.stats {
		display: flex;
		gap: var(--space-3);
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.actions {
		display: inline-flex;
		gap: var(--space-1);
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition:
			background var(--duration-fast),
			color var(--duration-fast);

		&:hover {
			background: var(--bg-tertiary);
			color: var(--text-primary);
		}
		&:focus-visible {
			outline: 2px solid var(--border-focus);
			outline-offset: 1px;
		}
		&.danger:hover {
			color: var(--color-error-500);
		}
	}

	/* Mobile: collapse the grid into a card */
	@media (max-width: 900px) {
		.track-row {
			grid-template-columns: 48px 1fr auto;
			grid-template-areas:
				'cover main actions'
				'gate gate gate'
				'stats status dur';
			row-gap: var(--space-2);
		}
		.cover {
			grid-area: cover;
		}
		.main {
			grid-area: main;
		}
		.actions {
			grid-area: actions;
		}
		.gate {
			grid-area: gate;
		}
		.status {
			grid-area: status;
		}
		.stats {
			grid-area: stats;
		}
		.dur {
			grid-area: dur;
		}
	}
</style>
