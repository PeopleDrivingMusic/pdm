<script lang="ts">
	import ContentListItem from './ContentListItem.svelte';
	import { Button } from '$lib/ui';
	import type { ContentTabId } from './ContentTypeTabs.svelte';

	interface FeedItem {
		id: string;
		sourceType: string;
		title: string;
		previewText: string | null;
		coverUrl: string | null;
		visibility: string;
		status: string;
		publishedAt: Date | string | null;
		scheduledAt: Date | string | null;
		createdAt: Date | string;
	}

	interface CollectionItem {
		id: string;
		title: string;
		description?: string | null;
		visibility: string;
		status: string;
		publishedAt?: Date | string | null;
		scheduledAt?: Date | string | null;
		createdAt: Date | string;
		coverUrl?: string | null;
	}

	interface Props {
		items: FeedItem[];
		photoAlbums: CollectionItem[];
		videoCollections: CollectionItem[];
		activeTab: ContentTabId;
		onCreatePost: () => void;
		onCreateGallery: () => void;
		onCreateVideo: () => void;
		onEditCollection: (item: FeedItem) => void;
		onPublishCollection: (item: FeedItem) => void;
		onDeleteCollection: (item: FeedItem) => void;
	}

	let {
		items,
		photoAlbums,
		videoCollections,
		activeTab,
		onCreatePost,
		onCreateGallery,
		onCreateVideo,
		onEditCollection,
		onPublishCollection,
		onDeleteCollection
	}: Props = $props();

	const albumItems = $derived(
		photoAlbums.map((album) => ({
			id: `photo_album:${album.id}`,
			sourceType: 'photo_album',
			title: album.title,
			previewText: album.description ?? null,
			coverUrl: album.coverUrl ?? null,
			visibility: album.visibility,
			status: album.status,
			publishedAt: album.publishedAt ?? null,
			scheduledAt: album.scheduledAt ?? null,
			createdAt: album.createdAt
		}))
	);

	const videoCollectionItems = $derived(
		videoCollections.map((collection) => ({
			id: `video_collection:${collection.id}`,
			sourceType: 'video_collection',
			title: collection.title,
			previewText: collection.description ?? null,
			coverUrl: collection.coverUrl ?? null,
			visibility: collection.visibility,
			status: collection.status,
			publishedAt: collection.publishedAt ?? null,
			scheduledAt: collection.scheduledAt ?? null,
			createdAt: collection.createdAt
		}))
	);

	function sortByCreatedAt<T extends { createdAt: Date | string }>(list: T[]) {
		return [...list].sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
	}

	const filteredItems = $derived.by(() => {
		const feedWithoutAlbums = items.filter((item) => item.sourceType !== 'photo_album');
		const allItems = sortByCreatedAt([
			...feedWithoutAlbums,
			...albumItems,
			...videoCollectionItems
		]);
		if (activeTab === 'all') return allItems;
		if (activeTab === 'scheduled') return allItems.filter((item) => item.status === 'scheduled');
		if (activeTab === 'draft') return allItems.filter((item) => item.status === 'draft');
		if (activeTab === 'photo_album') return sortByCreatedAt(albumItems);
		if (activeTab === 'video') {
			return sortByCreatedAt([
				...items.filter((item) => item.sourceType === 'video'),
				...videoCollectionItems
			]);
		}
		return items.filter((item) => item.sourceType === activeTab);
	});

	const emptyState = $derived.by(() => {
		if (activeTab === 'photo_album') {
			return {
				title: 'No galleries yet',
				description: 'Create a gallery catalog and start adding photos to it.',
				action: 'Create gallery',
				onClick: onCreateGallery
			};
		}
		if (activeTab === 'video') {
			return {
				title: 'No videos or playlists yet',
				description: 'Create a playlist or upload a video to organize your video content.',
				action: 'Upload video',
				onClick: onCreateVideo
			};
		}
		return {
			title: 'No content here yet',
			description:
				'Create a post with text, media, a poll, or attached music to start filling this view.',
			action: 'Create first post',
			onClick: onCreatePost
		};
	});
</script>

{#if filteredItems.length > 0}
	<div class="content-list" aria-label="Studio content list">
		{#each filteredItems as item (item.id)}
			<ContentListItem
				{item}
				onEdit={onEditCollection}
				onPublish={onPublishCollection}
				onDelete={onDeleteCollection}
			/>
		{/each}
	</div>
{:else}
	<section class="empty-state">
		<h2>{emptyState.title}</h2>
		<p>{emptyState.description}</p>
		<Button onClick={emptyState.onClick}>{emptyState.action}</Button>
	</section>
{/if}

<style lang="scss">
	.content-list {
		display: grid;
		gap: var(--space-3);
	}

	.empty-state {
		display: grid;
		justify-items: start;
		gap: var(--space-2);
		padding: var(--space-8);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-md);
		background: var(--bg-surface);

		h2,
		p {
			margin: 0;
		}

		h2 {
			color: var(--text-primary);
			font-size: var(--font-size-xl);
		}

		p {
			max-width: 520px;
			color: var(--text-secondary);
			font-size: var(--font-size-sm);
			line-height: 1.5;
		}

		:global(.btn) {
			margin-top: var(--space-3);
		}
	}
</style>
