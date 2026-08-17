<script lang="ts">
	import type { PageData } from '../$types';
	import { mdiLockOutline } from '@mdi/js';
	import { SvgIcon } from '$lib/ui';
	import { contentIcon, contentLabel, formatDate } from '../content-helpers';
	import ContentSkeleton from './ContentSkeleton.svelte';
	import LoadError from './LoadError.svelte';

	let { content }: { content: PageData['content'] } = $props();
</script>

{#await content}
	<div class="skeleton-stack">
		<ContentSkeleton kind="card" count={3} />
	</div>
{:then contentResolved}
	{#if contentResolved.feed.length}
		<div class="feed-list">
			{#each contentResolved.feed as item (item.id)}
				<article class="feed-card" class:is-locked={item.isLocked}>
					<div class="feed-icon">
						<SvgIcon path={contentIcon(item.type)} size={22} />
					</div>
					<div class="feed-body">
						<div class="meta-row">
							<span>{contentLabel(item.type)}</span>
							{#if item.visibility !== 'public'}
								<span class="visibility">
									<SvgIcon path={mdiLockOutline} size={13} />
									{item.visibility}
								</span>
							{/if}
							<span>{formatDate(item.publishedAt)}</span>
						</div>
						<h3>{item.title}</h3>
						<p>{item.type === 'post' ? item.excerpt : item.description}</p>
					</div>
					{#if item.isLocked}
						<div class="lock-overlay">
							<SvgIcon path={mdiLockOutline} size={20} />
							<span>Subscribe to unlock</span>
						</div>
					{/if}
				</article>
			{/each}
		</div>
	{:else}
		<div class="empty-state">No artist updates yet.</div>
	{/if}
{:catch}
	<LoadError message="Couldn't load the feed. Refresh to try again." />
{/await}

<style lang="scss">
	.skeleton-stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.feed-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.feed-card {
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
		display: grid;
		grid-template-columns: 48px minmax(0, 1fr);
		gap: var(--space-3);
		padding: var(--space-4);

		&:hover {
			transform: translateY(-2px);
			border-color: color-mix(in srgb, var(--primary) 45%, var(--border-primary));
		}
	}

	.feed-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--primary) 16%, var(--bg-tertiary));
		color: var(--primary);
	}

	.feed-body {
		min-width: 0;

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

	.lock-overlay {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--text-primary);
		position: absolute;
		inset: 0;
		justify-content: center;
		padding: var(--space-4);
		background: color-mix(in srgb, var(--bg-primary) 70%, transparent);
		backdrop-filter: blur(16px);
		text-align: center;
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
