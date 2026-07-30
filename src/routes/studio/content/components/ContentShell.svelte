<script lang="ts">
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import ContentComposerModal from './ContentComposerModal.svelte';
	import ContentHeader from './ContentHeader.svelte';
	import ContentList from './ContentList.svelte';
	import ContentTypeTabs, { type ContentTabId } from './ContentTypeTabs.svelte';
	import CollectionCreateOverlay from './CollectionCreateOverlay.svelte';
	import type { ContentStatus, ContentVisibility } from '$lib/db/content-visibility';

	type CollectionStatus = ContentStatus;
	type CollectionVisibility = ContentVisibility;

	interface ManageableContentItem {
		id: string;
		sourceType: string;
		title: string;
		previewText: string | null;
		visibility: string;
		status: string;
	}

	interface EditablePost {
		id: string;
		title: string;
		bodyJson: Record<string, unknown> | null;
		bodyHtml: string | null;
		visibility: string;
		status: string;
		scheduledAt: Date | string | null;
		mediaIds: string[];
		trackIds: string[];
		albumIds: string[];
		poll: {
			question: string;
			mode: string;
			showResults: string;
			closesAt: Date | string | null;
			options: Array<{ label: string }>;
		} | null;
	}

	interface Props {
		data: any;
		form?: { error?: string; success?: boolean } | null;
	}

	let { data, form }: Props = $props();

	let activeTab = $state<{ id: ContentTabId; label: string }>({ id: 'all', label: 'All' });
	let composerOpen = $state(false);
	let composerType = $state<'post' | 'gallery' | 'video'>('post');
	let composerMode = $state<'create' | 'edit'>('create');
	let composerInitialPost = $state<EditablePost | null>(null);
	let editingItem = $state<ManageableContentItem | null>(null);
	let notice = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	const content = $derived(data.content);
	const attachableMusic = $derived(data.attachableMusic);
	const artist = $derived(data.artist ?? null);

	function openComposer(type: 'post' | 'gallery' | 'video') {
		composerType = type;
		composerMode = 'create';
		composerInitialPost = null;
		composerOpen = true;
		notice = null;
	}

	function findPostForEdit(item: ManageableContentItem) {
		return (content.posts as EditablePost[]).find((post) => post.id === getItemId(item)) ?? null;
	}

	function openPostEditor(item: ManageableContentItem) {
		const post = findPostForEdit(item);
		if (!post) {
			notice = { type: 'error', text: 'Post not found.' };
			return;
		}

		composerType = 'post';
		composerMode = 'edit';
		composerInitialPost = post;
		composerOpen = true;
		notice = null;
	}

	function getItemId(item: ManageableContentItem) {
		return item.id.includes(':') ? item.id.split(':')[1] : item.id;
	}

	function getCollectionRequest(item: ManageableContentItem) {
		const id = getItemId(item);
		const collectionType = item.sourceType === 'photo_album' ? 'gallery' : 'playlist';
		const endpoint =
			item.sourceType === 'photo_album'
				? `/api/studio/content/photo-albums/${id}`
				: `/api/studio/content/video-collections/${id}`;

		return { endpoint, collectionType };
	}

	async function submitPostAction(action: string, payload: Record<string, string>) {
		const formData = new FormData();
		for (const [key, value] of Object.entries(payload)) {
			formData.set(key, value);
		}

		const response = await fetch(action, {
			method: 'POST',
			body: formData
		});
		const result = deserialize(await response.text());

		if (result.type === 'failure') {
			const data = result.data as { error?: string } | undefined;
			throw new Error(data?.error || 'Could not update post');
		}

		if (result.type === 'error') {
			throw new Error(result.error?.message || 'Could not update post');
		}

		if (!response.ok) {
			throw new Error('Could not update post');
		}
	}

	async function submitPostUpdateFromPost(post: EditablePost, overrides: Partial<EditablePost>) {
		const formData = new FormData();
		formData.set('postId', post.id);
		formData.set('title', overrides.title ?? post.title);
		formData.set('bodyHtml', post.bodyHtml ?? '');
		formData.set('bodyJson', post.bodyJson ? JSON.stringify(post.bodyJson) : '');
		const primedVisibility =
			(overrides.visibility ?? post.visibility) === 'public' ? 'public' : 'subscribers';
		formData.set('visibility', primedVisibility);
		formData.set('status', overrides.status ?? post.status);

		for (const mediaId of post.mediaIds ?? []) formData.append('existingMediaIds', mediaId);
		for (const trackId of post.trackIds ?? []) formData.append('trackIds', trackId);
		for (const albumId of post.albumIds ?? []) formData.append('albumIds', albumId);

		if (post.poll) {
			formData.set('pollEnabled', 'true');
			formData.set('pollQuestion', post.poll.question);
			formData.set('pollMode', post.poll.mode);
			formData.set('pollShowResults', post.poll.showResults);
			if (post.poll.closesAt) formData.set('pollClosesAt', String(post.poll.closesAt));
			for (const option of post.poll.options) formData.append('pollOptions', option.label);
		}

		const response = await fetch('?/updatePost', {
			method: 'POST',
			body: formData
		});
		const result = deserialize(await response.text());

		if (result.type === 'failure') {
			const data = result.data as { error?: string } | undefined;
			throw new Error(data?.error || 'Could not update post');
		}

		if (result.type === 'error') {
			throw new Error(result.error?.message || 'Could not update post');
		}
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

	async function updateItem(
		item: ManageableContentItem,
		payload: {
			title: string;
			description: string;
			visibility: CollectionVisibility;
			status?: CollectionStatus;
		}
	) {
		notice = null;

		if (item.sourceType === 'post') {
			const post = findPostForEdit(item);
			if (!post) throw new Error('Post not found.');
			await submitPostUpdateFromPost(post, {
				title: payload.title,
				visibility: payload.visibility,
				status: payload.status ?? item.status
			});
			editingItem = null;
			notice = { type: 'success', text: 'Post updated.' };
			await invalidateAll();
			return;
		}

		await updateCollection(item, payload);
		notice = { type: 'success', text: 'Collection updated.' };
	}

	async function publishItem(item: ManageableContentItem) {
		try {
			await updateItem(item, {
				title: item.title,
				description: item.previewText ?? '',
				visibility: item.visibility as CollectionVisibility,
				status: 'published'
			});
			notice = {
				type: 'success',
				text: item.sourceType === 'post' ? 'Post published.' : 'Collection published.'
			};
		} catch (err) {
			notice = {
				type: 'error',
				text: err instanceof Error ? err.message : 'Could not publish content.'
			};
		}
	}

	async function deleteItem(item: ManageableContentItem, confirmDelete = true) {
		if (confirmDelete && !window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
		notice = null;

		try {
			if (item.sourceType === 'post') {
				await submitPostAction('?/deletePost', {
					postId: getItemId(item)
				});
				editingItem = null;
				notice = { type: 'success', text: 'Post deleted.' };
				await invalidateAll();
				return;
			}

			const { endpoint } = getCollectionRequest(item);
			const response = await fetch(endpoint, { method: 'DELETE' });
			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Could not delete collection');
			}

			editingItem = null;
			notice = { type: 'success', text: 'Collection deleted.' };
			await invalidateAll();
		} catch (err) {
			notice = {
				type: 'error',
				text: err instanceof Error ? err.message : 'Could not delete content.'
			};
			throw err;
		}
	}
</script>

<section class="content-shell">
	<ContentHeader
		counts={content.counts}
		onCreatePost={() => openComposer('post')}
		onCreateGallery={() => openComposer('gallery')}
		onCreateVideo={() => openComposer('video')}
	/>

	{#if notice}
		<p class:form-message--error={notice.type === 'error'} class="form-message" role="status">
			{notice.text}
		</p>
	{:else if form?.error}
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
				onEditCollection={(item) => {
					if (item.sourceType === 'post') {
						openPostEditor(item);
						return;
					}
					editingItem = item;
				}}
				onPublishCollection={publishItem}
				onDeleteCollection={deleteItem}
			/>
		</div>
	</div>

	<ContentComposerModal
		open={composerOpen}
		type={composerType}
		mode={composerMode}
		initialPost={composerInitialPost}
		{artist}
		{attachableMusic}
		photoAlbums={content.photoAlbums}
		videoCollections={content.videoCollections}
		onClose={() => {
			composerOpen = false;
			composerMode = 'create';
			composerInitialPost = null;
		}}
		onSuccess={(message) => {
			composerOpen = false;
			notice = { type: 'success', text: message };
		}}
		onError={(message) => {
			notice = { type: 'error', text: message };
		}}
	/>

	<CollectionCreateOverlay
		open={Boolean(editingItem)}
		title={editingItem?.sourceType === 'post'
			? 'Edit post'
			: editingItem?.sourceType === 'photo_album'
				? 'Edit gallery'
				: 'Edit playlist'}
		submitLabel="Save changes"
		initialTitle={editingItem?.title ?? ''}
		initialDescription={editingItem?.previewText ?? ''}
		initialVisibility={((editingItem?.visibility ?? 'public') === 'public'
			? 'public'
			: 'subscribers') as CollectionVisibility}
		initialStatus={(editingItem?.status ?? 'draft') as CollectionStatus}
		showStatus
		deleteLabel={editingItem?.sourceType === 'post'
			? 'Delete post'
			: editingItem?.sourceType === 'photo_album'
				? 'Delete gallery'
				: 'Delete playlist'}
		onCreate={(payload) => {
			if (!editingItem) return Promise.resolve();
			return updateItem(editingItem, {
				title: payload.title,
				description: payload.description,
				visibility: payload.visibility,
				status: payload.status
			});
		}}
		onDelete={() => {
			if (!editingItem) return Promise.resolve();
			return deleteItem(editingItem, false);
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
