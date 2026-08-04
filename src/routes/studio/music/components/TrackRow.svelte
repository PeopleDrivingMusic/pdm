<script lang="ts">
	import type { ContentVisibility } from '$lib/db/content-visibility';
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
	import ProgressBar from '$lib/ui/ProgressBar.svelte';
	import { resolveR2ImageUrl } from '$lib/utils/helpers';
	import { coverGradient } from './coverGradient';
	import type { TrackDTO } from '$lib/server/music';
	import type { TrackUploadJob } from '$lib/studio/music/types';

	let {
		track,
		index = 0,
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
		index?: number;
		albumTitles?: string[];
		inheritedFrom?: 'album' | null;
		job?: TrackUploadJob | null;
		onEdit: (t: TrackDTO) => void;
		onDelete: (t: TrackDTO) => void;
		onLink: (t: TrackDTO) => void;
		onVisibilityChange: (t: TrackDTO, v: ContentVisibility) => void;
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
	const gated = $derived(track.visibility === 'subscribers');

	function fmtDuration(sec: number | null) {
		if (!sec) return '—';
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}
	const statusText = $derived(
		job?.state === 'finalizing'
			? 'Verifying…'
			: uploading
				? `Uploading ${Math.round(job?.progress ?? 0)}%`
				: failed
					? (job?.error ?? 'Upload failed')
					: null
	);
</script>

<li class="trow" class:busy={uploading} class:failed>
	<span class="num">{uploading || failed ? '' : String(index).padStart(2, '0')}</span>

	<span class="cov" class:dim={uploading || failed}>
		{#if coverSrc}
			<img src={coverSrc} alt="" loading="lazy" />
		{:else}
			<span class="ph" style={uploading || failed ? '' : `background:${coverGradient(track.id)}`}>
				{#if !uploading && !failed}<SvgIcon path={mdiMusicNote} size={16} />{/if}
			</span>
		{/if}
		{#if uploading}
			<span class="ovl" aria-hidden="true"><SvgIcon path={mdiUpload} size={15} /></span>
		{:else if failed}
			<button
				type="button"
				class="ovl retry"
				title="Retry upload"
				aria-label={`Retry ${track.title}`}
				onclick={() => onRetry(track.id)}
			>
				<SvgIcon path={mdiRefresh} size={15} />
			</button>
		{/if}
	</span>

	<span class="main">
		<span class="nm">
			{track.title}
			{#if !track.isPublished && !uploading && !failed}<em class="draft">Draft</em>{/if}
		</span>
		{#if statusText}
			<span class="status" role={failed ? 'alert' : 'status'}>{statusText}</span>
		{:else if albumTitles.length > 0}
			<span class="al">{albumTitles.join(', ')}</span>
		{/if}
		{#if uploading && job}
			<span class="pbar"
				><ProgressBar value={job.progress} label={`Uploading ${track.title}`} /></span
			>
		{/if}
	</span>

	<span class="du">{fmtDuration(track.duration)}</span>

	<button
		type="button"
		class="gpill"
		class:on={gated}
		aria-pressed={gated}
		title={inheritedFrom
			? 'Subscribers-only (inherited from album) — click to override'
			: gated
				? 'Subscribers-only — click to make public'
				: 'Public — click to make subscribers-only'}
		onclick={() => onVisibilityChange(track, gated ? 'public' : 'subscribers')}
	>
		{#if gated}
			<SvgIcon path={mdiLock} size={13} /> {inheritedFrom ? 'Subscribers*' : 'Subscribers'}
		{:else}
			<SvgIcon path={mdiEarth} size={13} /> Public
		{/if}
	</button>

	<span class="acts">
		<button
			type="button"
			title="Link to album"
			aria-label="Link to album"
			onclick={() => onLink(track)}
		>
			<SvgIcon path={mdiLink} size={16} />
		</button>
		<button type="button" title="Edit track" aria-label="Edit track" onclick={() => onEdit(track)}>
			<SvgIcon path={mdiPencil} size={16} />
		</button>
		<button
			type="button"
			class="danger"
			title="Delete track"
			aria-label="Delete track"
			onclick={() => onDelete(track)}
		>
			<SvgIcon path={mdiDelete} size={16} />
		</button>
	</span>
</li>

<style lang="scss">
	.trow {
		display: grid;
		grid-template-columns: 34px 44px minmax(0, 1fr) 56px 150px 108px;
		align-items: center;
		gap: 18px;
		padding: 13px 26px;
		border-top: 1px solid var(--border-primary);
	}
	.trow:hover {
		background: var(--bg-secondary);
	}
	.trow:focus-within {
		background: var(--bg-secondary);
	}

	.num {
		color: var(--text-tertiary);
		font-size: 14px;
		font-variant-numeric: tabular-nums;
		text-align: center;
	}

	.cov {
		position: relative;
		width: 44px;
		height: 44px;
		border-radius: 8px;
		overflow: hidden;
		img,
		.ph {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: flex;
			align-items: center;
			justify-content: center;
			color: rgba(255, 255, 255, 0.8);
		}
		&.dim img,
		&.dim .ph {
			filter: brightness(0.5);
		}
		.ph {
			background: var(--bg-tertiary);
		}
		.ovl {
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
		.ovl.retry {
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
		gap: 3px;
		.nm {
			font-size: 15px;
			font-weight: 600;
			color: var(--text-primary);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			display: flex;
			align-items: center;
			gap: 8px;
		}
		.draft {
			font-style: normal;
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 0.06em;
			color: var(--text-tertiary);
			background: var(--bg-tertiary);
			padding: 2px 6px;
			border-radius: 5px;
		}
		.al {
			font-size: 12px;
			color: var(--text-tertiary);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.status {
			font-size: 12px;
			color: var(--gate-tint-text);
		}
		.pbar {
			max-width: 240px;
		}
	}
	.trow.failed .status {
		color: var(--status-failed-text);
	}

	.du {
		text-align: right;
		font-size: 14px;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.gpill {
		justify-self: start;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border: 1px solid var(--border-primary);
		background: var(--bg-tertiary);
		padding: 6px 12px;
		border-radius: 999px;
		font-size: 12px;
		color: var(--text-secondary);
		cursor: pointer;
		white-space: nowrap;
		transition:
			background var(--duration-fast),
			color var(--duration-fast);

		&.on {
			background: var(--gate-tint-bg);
			color: var(--gate-tint-text);
			border-color: transparent;
		}
		&:focus-visible {
			outline: 2px solid var(--border-focus);
			outline-offset: 2px;
		}
	}

	.acts {
		display: inline-flex;
		gap: 4px;
		justify-self: end;
		opacity: 0;
		transition: opacity var(--duration-fast);

		button {
			width: 32px;
			height: 32px;
			border: 0;
			border-radius: 8px;
			background: transparent;
			color: var(--text-secondary);
			display: inline-flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			&:hover {
				background: var(--bg-tertiary);
				color: var(--text-primary);
			}
			&.danger:hover {
				color: var(--color-error-300);
			}
			&:focus-visible {
				outline: 2px solid var(--border-focus);
				opacity: 1;
			}
		}
	}
	.trow:hover .acts,
	.trow:focus-within .acts {
		opacity: 1;
	}

	@media (max-width: 760px) {
		.trow {
			grid-template-columns: 44px minmax(0, 1fr) auto;
			grid-template-areas:
				'cov main acts'
				'cov gate du';
			gap: 6px 14px;
			padding: 12px 16px;
		}
		.num {
			display: none;
		}
		.cov {
			grid-area: cov;
		}
		.main {
			grid-area: main;
		}
		.acts {
			grid-area: acts;
			opacity: 1;
		}
		.gpill {
			grid-area: gate;
		}
		.du {
			grid-area: du;
			text-align: right;
			align-self: center;
		}
	}
</style>
