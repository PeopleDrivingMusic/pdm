<script lang="ts">
	import { mdiChevronDown, mdiMusicNote, mdiRefresh, mdiClose } from '@mdi/js';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import ProgressBar from '$lib/ui/ProgressBar.svelte';
	import type { TrackUploadJob } from '$lib/studio/music/types';

	let {
		jobs,
		onRetry,
		onDismiss
	}: {
		jobs: TrackUploadJob[];
		onRetry: (trackId: string) => void;
		onDismiss: (trackId: string) => void;
	} = $props();

	let collapsed = $state(false);

	const active = $derived(
		jobs.filter((j) => j.state === 'uploading' || j.state === 'finalizing' || j.state === 'queued')
			.length
	);
	const failed = $derived(jobs.filter((j) => j.state === 'failed').length);

	function stateLabel(job: TrackUploadJob) {
		if (job.state === 'failed') return job.error || 'Upload failed';
		if (job.state === 'finalizing') return 'Verifying…';
		if (job.state === 'queued') return 'Queued';
		if (job.state === 'uploaded') return 'Uploaded';
		return `Uploading ${Math.round(job.progress)}%`;
	}
</script>

{#if jobs.length > 0}
	<section class="dock" aria-live="polite" aria-label="Upload queue">
		<header class="dock-head">
			<span class="summary">
				{#if active > 0}Uploading {active}{/if}
				{#if failed > 0}<span class="fail"> · {failed} failed</span>{/if}
				{#if active === 0 && failed === 0}Uploads{/if}
			</span>
			<button
				type="button"
				class="collapse"
				aria-expanded={!collapsed}
				title={collapsed ? 'Expand' : 'Collapse'}
				onclick={() => (collapsed = !collapsed)}
			>
				<SvgIcon path={mdiChevronDown} size={18} />
			</button>
		</header>
		{#if !collapsed}
			<ul class="jobs">
				{#each jobs as job (job.trackId)}
					<li class="job" class:failed={job.state === 'failed'}>
						<div class="thumb">
							{#if job.coverPreviewUrl}
								<img src={job.coverPreviewUrl} alt="" />
							{:else}
								<SvgIcon path={mdiMusicNote} size={16} />
							{/if}
						</div>
						<div class="info">
							<span class="title">{job.title}</span>
							<ProgressBar
								value={job.progress}
								label={`Uploading ${job.title}`}
								state={job.state === 'failed'
									? 'failed'
									: job.state === 'uploaded'
										? 'done'
										: 'active'}
								indeterminate={job.state === 'finalizing'}
							/>
							<span class="state" role={job.state === 'failed' ? 'alert' : 'status'}>
								{stateLabel(job)}
							</span>
						</div>
						{#if job.state === 'failed'}
							<button
								type="button"
								class="act"
								title="Retry"
								aria-label={`Retry ${job.title}`}
								onclick={() => onRetry(job.trackId)}
							>
								<SvgIcon path={mdiRefresh} size={16} />
							</button>
							<button
								type="button"
								class="act"
								title="Dismiss"
								aria-label={`Dismiss ${job.title}`}
								onclick={() => onDismiss(job.trackId)}
							>
								<SvgIcon path={mdiClose} size={16} />
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}

<style lang="scss">
	.dock {
		position: fixed;
		right: var(--space-6);
		bottom: var(--space-6);
		width: 360px;
		max-width: calc(100vw - var(--space-8));
		background: var(--bg-secondary);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-xl);
		z-index: var(--z-fixed, 40);
		overflow: hidden;

		@media (max-width: 640px) {
			right: var(--space-3);
			left: var(--space-3);
			width: auto;
			bottom: var(--space-3);
		}
	}

	.dock-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--border-primary);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--text-primary);

		.fail {
			color: var(--status-failed-text);
		}
		.collapse {
			border: 0;
			background: transparent;
			color: var(--text-secondary);
			cursor: pointer;
			display: inline-flex;
			&:focus-visible {
				outline: 2px solid var(--border-focus);
			}
		}
	}

	.jobs {
		list-style: none;
		margin: 0;
		padding: var(--space-2);
		max-height: 320px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.job {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2);
		border-radius: var(--radius-md);

		&:hover {
			background: var(--bg-tertiary);
		}
		.thumb {
			width: 36px;
			height: 36px;
			border-radius: var(--radius-sm);
			background: var(--bg-tertiary);
			display: flex;
			align-items: center;
			justify-content: center;
			color: var(--text-tertiary);
			overflow: hidden;
			flex-shrink: 0;
			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}
		}
		.info {
			flex: 1;
			min-width: 0;
			display: flex;
			flex-direction: column;
			gap: 4px;
		}
		.title {
			font-size: var(--font-size-sm);
			color: var(--text-primary);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.state {
			font-size: var(--font-size-xs);
			color: var(--text-tertiary);
		}
		&.failed .state {
			color: var(--status-failed-text);
		}
		.act {
			border: 0;
			background: transparent;
			color: var(--text-secondary);
			cursor: pointer;
			display: inline-flex;
			padding: 4px;
			border-radius: var(--radius-sm);
			&:hover {
				background: var(--bg-surface);
				color: var(--text-primary);
			}
			&:focus-visible {
				outline: 2px solid var(--border-focus);
			}
		}
	}
</style>
