<script lang="ts">
	import type { PageData } from '../$types';
	import { mdiLockOutline, mdiPlayCircleOutline, mdiVideoOutline } from '@mdi/js';
	import { SvgIcon } from '$lib/ui';
	import { contentLabel } from '../content-helpers';
	import ContentSkeleton from './ContentSkeleton.svelte';
	import LoadError from './LoadError.svelte';

	let { content }: { content: PageData['content'] } = $props();
</script>

{#await content}
	<div class="video-grid">
		<ContentSkeleton kind="card" count={4} />
	</div>
{:then contentResolved}
	{@const videoItems = [...contentResolved.videoCollections, ...contentResolved.videos]}
	{#if videoItems.length}
		<div class="video-grid">
			{#each videoItems as item}
				<article class="video-card" class:is-locked={item.isLocked}>
					<div class="video-preview">
						{#if item.type === 'video' && item.thumbnailUrl}
							<img src={item.thumbnailUrl} alt={item.title} loading="lazy" />
						{:else}
							<SvgIcon path={item.isLocked ? mdiLockOutline : mdiVideoOutline} size={36} />
						{/if}
						<div class="play-badge">
							<SvgIcon path={item.isLocked ? mdiLockOutline : mdiPlayCircleOutline} size={28} />
						</div>
					</div>
					<div class="card-copy">
						<div class="meta-row">
							<span>{contentLabel(item.type)}</span>
							{#if item.visibility !== 'public'}
								<span class="visibility">
									<SvgIcon path={mdiLockOutline} size={13} />
									{item.visibility}
								</span>
							{/if}
						</div>
						<h3>{item.title}</h3>
						<p>{item.description}</p>
						{#if item.isLocked}
							<div class="locked-inline">
								<SvgIcon path={mdiLockOutline} size={16} />
								<span>Subscribe to unlock</span>
							</div>
						{/if}
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<div class="empty-state">No videos yet.</div>
	{/if}
{:catch}
	<LoadError message="Couldn't load videos. Refresh to try again." />
{/await}

<style lang="scss">
	.video-grid {
		display: grid;
		gap: var(--space-3);
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	}

	.video-card {
		position: relative;
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--border-primary) 62%, transparent);
		border-radius: var(--radius-lg);
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.035), transparent 40%),
			color-mix(in srgb, var(--bg-surface) 74%, var(--bg-primary));
		box-shadow: 0 14px 40px rgba(0, 0, 0, 0.16);
		transition:
			transform var(--duration-normal) var(--easing-ease-out),
			border-color var(--duration-normal) var(--easing-ease-out),
			background-color var(--duration-normal) var(--easing-ease-out);

		&:hover {
			transform: translateY(-2px);
			border-color: color-mix(in srgb, var(--primary) 45%, var(--border-primary));
		}
	}

	.video-preview {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		aspect-ratio: 16 / 10;
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--primary) 22%, transparent), transparent 54%),
			var(--bg-tertiary);
		color: var(--text-secondary);

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.card-copy {
		min-width: 0;
		padding: var(--space-3);

		h3 {
			margin: var(--space-1) 0;
			color: var(--text-primary);
			font-size: var(--font-size-lg);
			line-height: 1.25;
		}

		p {
			margin: 0;
			color: var(--text-secondary);
			font-size: var(--font-size-sm);
			line-height: 1.5;
		}
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		color: var(--text-secondary);
		font-size: var(--font-size-xs);
	}

	.visibility {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--primary);
		text-transform: capitalize;
	}

	.play-badge {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-primary);
		background: rgba(0, 0, 0, 0.18);
	}

	.locked-inline {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--primary);
		margin-top: var(--space-3);
		font-size: var(--font-size-sm);
		font-weight: 700;
	}

	.is-locked {
		border-color: color-mix(in srgb, var(--primary) 42%, transparent);
	}

	.empty-state {
		padding: var(--space-6);
		border: 1px dashed color-mix(in srgb, var(--border-primary) 58%, transparent);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--bg-surface) 46%, transparent);
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		text-align: center;
	}
</style>
