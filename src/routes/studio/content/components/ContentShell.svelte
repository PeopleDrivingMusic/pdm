<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import ContentComposerModal from './ContentComposerModal.svelte';
	import ContentHeader from './ContentHeader.svelte';
	import ContentList from './ContentList.svelte';
	import ContentTypeTabs, { type ContentTabId } from './ContentTypeTabs.svelte';
	import CollectionCreateOverlay from './CollectionCreateOverlay.svelte';

	type CollectionStatus = 'draft' | 'published' | 'scheduled' | 'archived';
	type CollectionVisibility = 'public' | 'followers' | 'subscribers' | 'investors';

	interface ManageableContentItem {
		id: string;
		sourceType: string;
		title: string;
		previewText: string | null;
		visibility: string;
		status: string;
	}

	interface Props {
		data: any;
		form?: { error?: string; success?: boolean } | null;
	}

	let { data, form }: Props = $props();

	let activeTab = $state<{ id: ContentTabId; label: string }>({ id: 'all', label: 'All' });
	let composerOpen = $state(false);
	let composerType = $state<'post' | 'gallery' | 'video'>('post');
	let editingItem = $state<ManageableContentItem | null>(null);

	const content = $derived(data.content);
	const attachableMusic = $derived(data.attachableMusic);
	const artist = $derived(data.artist ?? null);

	function openComposer(type: 'post' | 'gallery' | 'video') {
		composerType = type;
		composerOpen = true;
	}

	function getCollectionRequest(item: ManageableContentItem) {
		const id = item.id.includes(':') ? item.id.split(':')[1] : item.id;
		const collectionType = item.sourceType === 'photo_album' ? 'gallery' : 'playlist';
		const endpoint =
			item.sourceType === 'photo_album'
				? `/api/studio/content/photo-albums/${id}`
				: `/api/studio/content/video-collections/${id}`;

		return { endpoint, collectionType };
	}

	async function updateCollection(
		item: ManageableContentItem,
		payload: {
			title: string;
			description: string;
			visibility: CollectionVisibility;
			status?: CollectionStatus;
		}
	) {
		const { endpoint } = getCollectionRequest(item);
		const response = await fetch(endpoint, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				title: payload.title,
				description: payload.description,
				visibility: payload.visibility,
				status: payload.status ?? item.status
			})
		});
		const result = await response.json();

		if (!response.ok) {
			throw new Error(result.error || 'Could not update collection');
		}

		editingItem = null;
		await invalidateAll();
	}

	async function publishCollection(item: ManageableContentItem) {
		await updateCollection(item, {
			title: item.title,
			description: item.previewText ?? '',
			visibility: item.visibility as CollectionVisibility,
			status: 'published'
		});
	}

	async function deleteCollection(item: ManageableContentItem, confirmDelete = true) {
		if (confirmDelete && !window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;

		const { endpoint } = getCollectionRequest(item);
		const response = await fetch(endpoint, { method: 'DELETE' });
		const result = await response.json();

		if (!response.ok) {
			throw new Error(result.error || 'Could not delete collection');
		}

		editingItem = null;
		await invalidateAll();
	}
</script>

<section class="content-shell">
	<ContentHeader
		counts={content.counts}
		onCreatePost={() => openComposer('post')}
		onCreateGallery={() => openComposer('gallery')}
		onCreateVideo={() => openComposer('video')}
	/>

	{#if form?.error}
		<p class="form-message form-message--error" role="alert">{form.error}</p>
	{:else if form?.success}
		<p class="form-message" role="status">Saved.</p>
	{/if}

	<div class="workspace">
		<div class="main">
			<ContentTypeTabs bind:activeTab />
			<ContentList
				items={content.feedItems}
				photoAlbums={content.photoAlbums}
				videoCollections={content.videoCollections}
				activeTab={activeTab.id}
				onCreatePost={() => openComposer('post')}
				onCreateGallery={() => openComposer('gallery')}
				onCreateVideo={() => openComposer('video')}
				onEditCollection={(item) => (editingItem = item)}
				onPublishCollection={publishCollection}
				onDeleteCollection={deleteCollection}
			/>
		</div>
	</div>

	<ContentComposerModal
		open={composerOpen}
		type={composerType}
		{artist}
		{attachableMusic}
		photoAlbums={content.photoAlbums}
		videoCollections={content.videoCollections}
		onClose={() => (composerOpen = false)}
	/>

	<CollectionCreateOverlay
		open={Boolean(editingItem)}
		title={editingItem?.sourceType === 'photo_album' ? 'Edit gallery' : 'Edit playlist'}
		submitLabel="Save changes"
		initialTitle={editingItem?.title ?? ''}
		initialDescription={editingItem?.previewText ?? ''}
		initialVisibility={(editingItem?.visibility ?? 'public') as CollectionVisibility}
		initialStatus={(editingItem?.status ?? 'draft') as CollectionStatus}
		showStatus
		deleteLabel={editingItem?.sourceType === 'photo_album' ? 'Delete gallery' : 'Delete playlist'}
		onCreate={(payload) => {
			if (!editingItem) return Promise.resolve();
			return updateCollection(editingItem, {
				title: payload.title,
				description: payload.description,
				visibility: payload.visibility,
				status: payload.status
			});
		}}
		onDelete={() => {
			if (!editingItem) return Promise.resolve();
			return deleteCollection(editingItem, false);
		}}
		onCancel={() => (editingItem = null)}
	/>
</section>

<style lang="scss">
	.content-shell {
		padding: var(--space-8);
	}

	.form-message {
		margin: 0 0 var(--space-4);
		padding: var(--space-3) var(--space-4);
		border: 1px solid color-mix(in srgb, var(--success) 40%, transparent);
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--success) 10%, transparent);
		color: var(--success);
		font-size: var(--font-size-sm);
	}

	.form-message--error {
		border-color: color-mix(in srgb, var(--error) 40%, transparent);
		background: color-mix(in srgb, var(--error) 10%, transparent);
		color: var(--error);
	}

	.workspace {
		min-width: 0;
	}

	@media (max-width: 640px) {
		.content-shell {
			padding: var(--space-5);
		}
	}
</style>
