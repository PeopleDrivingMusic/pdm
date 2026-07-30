<script lang="ts">
	import type { PageData } from '../$types';
	import ContentSkeleton from './ContentSkeleton.svelte';

	let { content }: { content: PageData['content'] } = $props();
</script>

{#await content}
	<div class="mini-photo-grid">
		<ContentSkeleton kind="card" count={6} />
	</div>
{:then contentResolved}
	{@const latestPhotos = contentResolved.photoAlbums.flatMap((album) => album.photos).slice(0, 6)}
	{#if latestPhotos.length}
		<div class="mini-photo-grid">
			{#each latestPhotos as photo}
				<img
					src={photo.thumbnailUrl || photo.fileUrl}
					alt={photo.alt || photo.caption || 'Artist photo'}
					loading="lazy"
				/>
			{/each}
		</div>
	{:else}
		<div class="empty-state compact">No public photos yet.</div>
	{/if}
{:catch}
	<div class="empty-state compact">Couldn't load photos.</div>
{/await}

<style lang="scss">
	.mini-photo-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-2);
		margin-top: var(--space-3);

		img {
			width: 100%;
			aspect-ratio: 1;
			object-fit: cover;
			border-radius: var(--radius-sm);
		}
	}

	.empty-state {
		padding: var(--space-6);
		border: 1px dashed color-mix(in srgb, var(--border-primary) 58%, transparent);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--bg-surface) 46%, transparent);
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		text-align: center;

		&.compact {
			padding: var(--space-4);
		}
	}
</style>
