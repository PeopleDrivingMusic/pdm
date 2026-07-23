<script lang="ts">
	import { deserialize, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { mdiArrowLeft, mdiClose, mdiImageOutline, mdiMusicNotePlus, mdiPoll } from '@mdi/js';
	import { Button, FileUpload, IconButton, Input, Select, SvgIcon } from '$lib/ui';
	import MultiPhotoInput from '$lib/ui/components/MultiPhotoInput.svelte';
	import type { Editor } from '@tiptap/core';
	import CollectionCreateOverlay from './CollectionCreateOverlay.svelte';
	import MusicAttachmentPicker from './MusicAttachmentPicker.svelte';
	import PollBuilder from './PollBuilder.svelte';
	import PostEditor from './PostEditor.svelte';
	import PostEditorToolbar from './PostEditorToolbar.svelte';
	import PublishPanel from './PublishPanel.svelte';
	import { uploadR2Target, type ClientMediaUploadTarget } from '$lib/utils/helpers';
	import {
		preparePostPhoto,
		deleteContentPhotos,
		beaconDeleteContentPhotos
	} from '$lib/utils/postPhotos';

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
			question: string | null;
			mode: string;
			showResults: string;
			closesAt: Date | string | null;
			options: Array<{ label: string }>;
		} | null;
	}

	interface Props {
		open: boolean;
		type: 'post' | 'gallery' | 'video';
		mode?: 'create' | 'edit';
		initialPost?: EditablePost | null;
		artist: {
			name: string;
			avatar?: string | null;
		} | null;
		attachableMusic: {
			tracks: Array<{
				id: string;
				title: string;
				imageUrl: string | null;
				isPublished: boolean | null;
			}>;
			albums: Array<{
				id: string;
				title: string;
				coverImageUrl: string | null;
				isPublished: boolean | null;
			}>;
		};
		photoAlbums: Array<{ id: string; title: string; status: string }>;
		videoCollections: Array<{ id: string; title: string; status: string }>;
		onClose: () => void;
		onSuccess?: (message: string) => void;
		onError?: (message: string) => void;
	}

	let {
		open,
		type,
		mode = 'create',
		initialPost = null,
		artist,
		attachableMusic,
		photoAlbums,
		videoCollections,
		onClose,
		onSuccess,
		onError
	}: Props = $props();

	let postStatus = $state('draft');
	let postVisibility = $state('public');
	let postTitle = $state('');
	let galleryStatus = $state('draft');
	let galleryVisibility = $state('public');
	let videoStatus = $state('draft');
	let videoVisibility = $state('public');
	let galleryPublishStep = $state(false);
	let videoPublishStep = $state(false);
	let localPhotoAlbums = $state(photoAlbums);
	let localVideoCollections = $state(videoCollections);
	let galleryDestination = $state('');
	let videoDestination = $state('__none__');
	let galleryCreateOpen = $state(false);
	let videoCollectionCreateOpen = $state(false);
	let activeWidget = $state<'none' | 'cover' | 'music' | 'poll'>('none');
	let publishStep = $state(false);
	let coverEnabled = $state(false);
	let musicEnabled = $state(false);
	let pollEnabled = $state(false);
	let postPhotoUploads = $state<Array<{ key: string; contentType: string; size: number }>>([]);

	function handleClose() {
		// Photos uploaded to R2 but never published are orphans — best-effort clean them up.
		if (postPhotoUploads.length) {
			void deleteContentPhotos(postPhotoUploads.map((photo) => photo.key));
			postPhotoUploads = [];
		}
		onClose();
	}

	// Survives a hard tab/window close, when handleClose never runs.
	$effect(() => {
		function onBeforeUnload() {
			if (postPhotoUploads.length) {
				beaconDeleteContentPhotos(postPhotoUploads.map((photo) => photo.key));
			}
		}
		window.addEventListener('beforeunload', onBeforeUnload);
		return () => window.removeEventListener('beforeunload', onBeforeUnload);
	});
	let editor = $state<Editor | null>(null);
	let submitError = $state('');
	let isSubmitting = $state(false);
	let mediaUpload = $state({
		active: false,
		progress: 0
	});

	const title = $derived(
		type === 'post'
			? mode === 'edit'
				? 'Edit post'
				: 'Create post'
			: type === 'gallery'
				? 'Create gallery'
				: 'Upload video'
	);
	const postAction = $derived(mode === 'edit' && initialPost ? '?/updatePost' : '?/createPost');
	const initialEditorContent = $derived(initialPost?.bodyJson ?? initialPost?.bodyHtml ?? '');
	const photoAlbumOptions = $derived([
		{ label: '+ Create new gallery', value: '__create__' },
		...localPhotoAlbums.map((album) => ({
			label: `${album.title}${album.status === 'draft' ? ' · Draft' : ''}`,
			value: album.id
		}))
	]);
	const videoCollectionOptions = $derived([
		{ label: 'No playlist', value: '__none__' },
		{ label: '+ Create new playlist', value: '__create__' },
		...localVideoCollections.map((collection) => ({
			label: `${collection.title}${collection.status === 'draft' ? ' · Draft' : ''}`,
			value: collection.id
		}))
	]);
	const galleryCollectionMode = $derived('existing');
	const videoCollectionMode = $derived(videoDestination === '__none__' ? 'none' : 'existing');

	$effect(() => {
		if (!open) {
			activeWidget = 'none';
			publishStep = false;
			galleryPublishStep = false;
			videoPublishStep = false;
			galleryCreateOpen = false;
			videoCollectionCreateOpen = false;
			submitError = '';
			isSubmitting = false;
			mediaUpload.active = false;
			mediaUpload.progress = 0;
		}
	});

	$effect(() => {
		if (!open || type !== 'post') return;

		postTitle = initialPost?.title ?? '';
		postStatus = initialPost?.status ?? 'draft';
		postVisibility = initialPost?.visibility ?? 'public';
		coverEnabled = Boolean(initialPost?.mediaIds?.length);
		musicEnabled = Boolean(initialPost?.trackIds?.length || initialPost?.albumIds?.length);
		pollEnabled = Boolean(initialPost?.poll);
		activeWidget = 'none';
		publishStep = false;
		submitError = '';
	});

	$effect(() => {
		localPhotoAlbums = photoAlbums;
		localVideoCollections = videoCollections;
	});

	$effect(() => {
		if (!galleryDestination && localPhotoAlbums.length > 0) {
			galleryDestination = localPhotoAlbums[0].id;
		}
	});

	$effect(() => {
		if (galleryDestination === '__create__') {
			galleryCreateOpen = true;
			galleryDestination = localPhotoAlbums[0]?.id ?? '';
		}
	});

	$effect(() => {
		if (videoDestination === '__create__') {
			videoCollectionCreateOpen = true;
			videoDestination = '__none__';
		}
	});

	function openWidget(widget: 'cover' | 'music' | 'poll') {
		if (widget === 'cover') coverEnabled = true;
		if (widget === 'music') musicEnabled = true;
		if (widget === 'poll') pollEnabled = true;
		activeWidget = widget;
		publishStep = false;
	}

	function removeWidget(widget: 'cover' | 'music' | 'poll') {
		if (widget === 'cover') coverEnabled = false;
		if (widget === 'music') musicEnabled = false;
		if (widget === 'poll') pollEnabled = false;
		activeWidget = 'none';
	}

	function openPublishStep() {
		activeWidget = 'none';
		postStatus = 'published';
		publishStep = true;
	}

	function openGalleryPublishStep() {
		galleryStatus = 'published';
		galleryPublishStep = true;
	}

	function openVideoPublishStep() {
		videoStatus = 'published';
		videoPublishStep = true;
	}

	function getSuccessMessage(contentType: 'post' | 'gallery' | 'video', formData: FormData) {
		const status = String(formData.get('status') || 'published');
		const noun = contentType === 'post' ? 'Post' : contentType === 'gallery' ? 'Gallery' : 'Video';
		const isUpdate = contentType === 'post' && Boolean(formData.get('postId'));

		if (isUpdate && status !== 'published' && status !== 'scheduled') return `${noun} updated.`;
		if (status === 'draft') return `${noun} draft saved.`;
		if (status === 'scheduled') return `${noun} scheduled.`;
		return `${noun} published.`;
	}

	function getFailureMessage(resultData: unknown) {
		if (resultData && typeof resultData === 'object' && 'error' in resultData) {
			const error = (resultData as { error?: unknown }).error;
			if (typeof error === 'string' && error.trim()) return error;
		}

		return 'Could not save content. Your draft is still here.';
	}

	async function submitWithRetry(
		action: URL,
		formData: FormData,
		contentType: 'post' | 'gallery' | 'video'
	) {
		isSubmitting = true;
		submitError = '';

		for (let attempt = 0; attempt < 2; attempt += 1) {
			try {
				const preparedFormData =
					contentType === 'gallery'
						? await prepareGalleryUpload(formData)
						: contentType === 'post'
							? attachPostPhotos(formData)
							: formData;
				const response = await fetch(action, {
					method: 'POST',
					body: preparedFormData
				});
				const result = deserialize(await response.text());

				if (result.type === 'success' || result.type === 'redirect') {
					await invalidateAll();
					const message = getSuccessMessage(contentType, preparedFormData);
					// Photos are now attached to the post — clear so close-cleanup won't delete them.
					postPhotoUploads = [];
					onSuccess?.(message);
					onClose();
					return;
				}

				if (result.type === 'failure') {
					const message = getFailureMessage(result.data);
					submitError = message;
					onError?.(message);
					mediaUpload.active = false;
					return;
				}

				if (result.type === 'error') {
					if (attempt === 0 && response.status >= 500) continue;
					throw new Error(
						result.error?.message || 'Could not save content. Your draft is still here.'
					);
				}
			} catch (err) {
				if (attempt === 0) continue;

				const message =
					err instanceof Error ? err.message : 'Could not save content. Your draft is still here.';
				submitError = message;
				onError?.(message);
				mediaUpload.active = false;
				return;
			}
		}

		const message = 'Could not save content. Your draft is still here.';
		submitError = message;
		onError?.(message);
		mediaUpload.active = false;
		isSubmitting = false;
	}

	async function prepareGalleryUpload(formData: FormData) {
		const file = formData.get('photo');
		if (!(file instanceof File) || file.size === 0) return formData;

		mediaUpload.active = true;
		mediaUpload.progress = 0;
		const response = await fetch('/api/studio/media/upload-target', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				kind: 'content-photo',
				fileName: file.name,
				contentType: file.type,
				size: file.size
			})
		});
		const result = await response.json();

		if (!response.ok) {
			throw new Error(result.error || 'Could not prepare photo upload');
		}

		const upload = result.upload as ClientMediaUploadTarget;
		await uploadR2Target({
			file,
			upload,
			onProgress: (percent) => {
				mediaUpload.progress = Math.max(0, Math.min(100, Math.round(percent)));
			}
		});

		formData.delete('photo');
		formData.set('uploadedPhotoKey', upload.key);
		formData.set('photoFileType', file.type);
		formData.set('photoFileSize', String(file.size));
		mediaUpload.progress = 100;
		return formData;
	}

	// Photos are already uploaded to R2 on selection, so publishing just attaches their keys.
	// Idempotent: a submit retry re-runs this on the same FormData, so clear first.
	function attachPostPhotos(formData: FormData) {
		formData.delete('uploadedPhotoKeys');
		formData.delete('uploadedPhotoTypes');
		formData.delete('uploadedPhotoSizes');
		for (const photo of postPhotoUploads) {
			formData.append('uploadedPhotoKeys', photo.key);
			formData.append('uploadedPhotoTypes', photo.contentType);
			formData.append('uploadedPhotoSizes', String(photo.size));
		}
		return formData;
	}

	function createSubmitHandler(contentType: 'post' | 'gallery' | 'video') {
		return ({
			action,
			formData,
			cancel
		}: {
			action: URL;
			formData: FormData;
			cancel: () => void;
		}) => {
			cancel();
			void submitWithRetry(action, formData, contentType).finally(() => {
				isSubmitting = false;
			});
		};
	}

	async function createPhotoAlbum(payload: {
		title: string;
		description: string;
		visibility: 'public' | 'subscribers';
	}) {
		const response = await fetch('/api/studio/content/photo-albums', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const result = await response.json();

		if (!response.ok) {
			throw new Error(result.error || 'Could not create gallery');
		}

		localPhotoAlbums = [result.album, ...localPhotoAlbums];
		galleryDestination = result.album.id;
		galleryCreateOpen = false;
		await invalidateAll();
	}

	async function createVideoCollection(payload: {
		title: string;
		description: string;
		visibility: 'public' | 'subscribers';
	}) {
		const response = await fetch('/api/studio/content/video-collections', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const result = await response.json();

		if (!response.ok) {
			throw new Error(result.error || 'Could not create playlist');
		}

		localVideoCollections = [result.collection, ...localVideoCollections];
		videoDestination = result.collection.id;
		videoCollectionCreateOpen = false;
		await invalidateAll();
	}
</script>

{#if open}
	<div class="modal-backdrop">
		<button class="backdrop-button" type="button" aria-label="Close composer" onclick={handleClose}
		></button>
		<div class="composer-modal" role="dialog" aria-modal="true" aria-label={title}>
			<header class="modal-header">
				<div class="identity">
					<div class="avatar">
						{#if artist?.avatar}
							<img src={artist.avatar} alt="" />
						{:else}
							<span>{artist?.name?.slice(0, 1) || 'P'}</span>
						{/if}
					</div>
					<div>
						<h2>{type === 'post' ? artist?.name || 'Artist' : title}</h2>
						<p>
							{type === 'post'
								? mode === 'edit'
									? 'Update post content and widgets'
									: 'Create something for your audience'
								: type === 'gallery'
									? 'Add a photo gallery to your artist page'
									: 'Upload video content for your fans'}
						</p>
					</div>
				</div>

				<IconButton path={mdiClose} label="Close composer" onClick={handleClose} />
			</header>

			{#if type === 'post'}
				<form
					method="POST"
					action={postAction}
					enctype="multipart/form-data"
					use:enhance={createSubmitHandler('post')}
				>
					{#if mode === 'edit' && initialPost}
						<input type="hidden" name="postId" value={initialPost.id} />
					{/if}
					<input type="hidden" name="status" value={postStatus} />
					<input type="hidden" name="visibility" value={postVisibility} />
					<input type="hidden" name="pollEnabled" value={pollEnabled ? 'true' : 'false'} />
					{#if coverEnabled}
						{#each initialPost?.mediaIds ?? [] as mediaId (mediaId)}
							<input type="hidden" name="existingMediaIds" value={mediaId} />
						{/each}
					{/if}
					<div class="modal-body modal-body--post">
						<input
							class="title-input"
							name="title"
							aria-label="Post title"
							placeholder="What do you want to share with fans?"
							bind:value={postTitle}
							required
						/>
						<PostEditor bind:editor initialContent={initialEditorContent} />

						{#if coverEnabled || musicEnabled || pollEnabled}
							<div
								class="inline-overlay"
								class:inline-overlay--hidden={activeWidget === 'none'}
								role="dialog"
								aria-label="Widget settings"
							>
								<div class="inline-overlay__panel">
									<div class="inline-overlay__header">
										<div>
											<h3>
												{activeWidget === 'cover'
													? 'Photos'
													: activeWidget === 'music'
														? 'Attach music'
														: 'Poll'}
											</h3>
										</div>
										<div class="inline-overlay__actions">
											<button
												type="button"
												class="remove-widget"
												onclick={() =>
													removeWidget(activeWidget === 'none' ? 'cover' : activeWidget)}
											>
												Remove
											</button>
											<IconButton
												path={mdiClose}
												label="Close widget settings"
												onClick={() => (activeWidget = 'none')}
											/>
										</div>
									</div>

									{#if coverEnabled}
										<div class:widget-panel--hidden={activeWidget !== 'cover'}>
											<MultiPhotoInput
												onUpload={preparePostPhoto}
												onRemovePhoto={(photo) => deleteContentPhotos([photo.key])}
												onChange={(photos) => (postPhotoUploads = photos)}
											/>
										</div>
									{/if}

									{#if musicEnabled}
										<div class:widget-panel--hidden={activeWidget !== 'music'}>
											<MusicAttachmentPicker
												tracks={attachableMusic.tracks}
												albums={attachableMusic.albums}
												selectedTrackIds={initialPost?.trackIds ?? []}
												selectedAlbumIds={initialPost?.albumIds ?? []}
											/>
										</div>
									{/if}

									{#if pollEnabled}
										<div class:widget-panel--hidden={activeWidget !== 'poll'}>
											<PollBuilder initialPoll={initialPost?.poll ?? null} />
										</div>
									{/if}
								</div>
							</div>
						{/if}

						{#if publishStep}
							<div class="inline-overlay" role="dialog" aria-label="Publish settings">
								<div class="inline-overlay__panel inline-overlay__panel--publish">
									<div class="inline-overlay__header">
										<button type="button" class="back-button" onclick={() => (publishStep = false)}>
											<SvgIcon path={mdiArrowLeft} size={18} />
											Back
										</button>
										<IconButton
											path={mdiClose}
											label="Close publish settings"
											onClick={() => (publishStep = false)}
										/>
									</div>
									<PublishPanel bind:status={postStatus} bind:visibility={postVisibility} />
									{#if submitError}
										<p class="submit-error" role="alert">{submitError}</p>
									{/if}
									<div class="publish-actions">
										<Button
											type="submit"
											variant="secondary"
											disabled={isSubmitting}
											onClick={() => (postStatus = 'draft')}
										>
											{isSubmitting && postStatus === 'draft' ? 'Saving...' : 'Save draft'}
										</Button>
										<Button
											type="submit"
											disabled={isSubmitting}
											onClick={() => (postStatus = 'published')}
										>
											{isSubmitting && postStatus === 'published' ? 'Publishing...' : 'Publish'}
										</Button>
									</div>
								</div>
							</div>
						{/if}
					</div>

					{#if !publishStep}
						<footer class="modal-footer">
							<div class="composer-tools">
								<PostEditorToolbar {editor} />
								<div class="tool-divider"></div>
								<div class="widget-toolbar" aria-label="Post widgets">
									<IconButton
										path={mdiImageOutline}
										label={coverEnabled ? 'Edit photos' : 'Add photos'}
										active={coverEnabled}
										onClick={() => openWidget('cover')}
									/>
									<IconButton
										path={mdiMusicNotePlus}
										label={musicEnabled ? 'Edit attached music' : 'Attach music'}
										active={musicEnabled}
										onClick={() => openWidget('music')}
									/>
									<IconButton
										path={mdiPoll}
										label={pollEnabled ? 'Edit poll' : 'Add poll'}
										active={pollEnabled}
										onClick={() => openWidget('poll')}
									/>
								</div>
							</div>

							<div class="submit-area">
								<Button type="button" disabled={isSubmitting} onClick={openPublishStep}
									>Continue</Button
								>
							</div>
						</footer>
					{/if}
				</form>
			{:else if type === 'gallery'}
				<form
					method="POST"
					action="?/createGallery"
					enctype="multipart/form-data"
					use:enhance={createSubmitHandler('gallery')}
				>
					<input type="hidden" name="status" value={galleryStatus} />
					<input type="hidden" name="visibility" value={galleryVisibility} />
					<input type="hidden" name="collectionMode" value={galleryCollectionMode} />
					<input
						type="hidden"
						name="existingPhotoAlbumId"
						value={galleryCollectionMode === 'existing' ? galleryDestination : ''}
					/>
					<div class="modal-body modal-body--compact">
						<section class="collection-choice">
							<Select
								label="Gallery"
								options={photoAlbumOptions}
								placeholder="Choose or create gallery"
								bind:value={galleryDestination}
								required
							/>
						</section>

						<FileUpload
							label="Photo"
							name="photo"
							accept="image/jpeg,image/png,image/webp"
							maxSize={5}
							disabled={isSubmitting}
							required
						/>

						<Input
							label="Photo tags"
							name="photoTags"
							placeholder="backstage, live, studio"
							disabled={isSubmitting}
						/>

						{#if mediaUpload.active}
							<div class="media-upload-progress" role="status" aria-live="polite">
								<div class="media-upload-progress__meta">
									<span>Uploading photo</span>
									<strong>{mediaUpload.progress}%</strong>
								</div>
								<progress max="100" value={mediaUpload.progress}></progress>
							</div>
						{/if}

						{#if galleryPublishStep}
							<div class="inline-overlay" role="dialog" aria-label="Publish gallery settings">
								<div class="inline-overlay__panel inline-overlay__panel--publish">
									<div class="inline-overlay__header">
										<button
											type="button"
											class="back-button"
											onclick={() => (galleryPublishStep = false)}
										>
											<SvgIcon path={mdiArrowLeft} size={18} />
											Back
										</button>
										<IconButton
											path={mdiClose}
											label="Close publish settings"
											onClick={() => (galleryPublishStep = false)}
										/>
									</div>
									<PublishPanel bind:status={galleryStatus} bind:visibility={galleryVisibility} />
									{#if submitError}
										<p class="submit-error" role="alert">{submitError}</p>
									{/if}
									<div class="publish-actions">
										<Button
											type="submit"
											variant="secondary"
											disabled={isSubmitting}
											onClick={() => (galleryStatus = 'draft')}
										>
											{isSubmitting && galleryStatus === 'draft' ? 'Saving...' : 'Save draft'}
										</Button>
										<Button
											type="submit"
											disabled={isSubmitting}
											onClick={() => (galleryStatus = 'published')}
										>
											{isSubmitting && galleryStatus === 'published' ? 'Publishing...' : 'Publish'}
										</Button>
									</div>
								</div>
							</div>
						{/if}
					</div>
					{#if !galleryPublishStep}
						<footer class="modal-footer modal-footer--end">
							<Button
								type="button"
								disabled={!galleryDestination || isSubmitting}
								onClick={openGalleryPublishStep}
							>
								Continue
							</Button>
						</footer>
					{/if}
				</form>
			{:else}
				<form
					method="POST"
					action="?/createVideo"
					enctype="multipart/form-data"
					use:enhance={createSubmitHandler('video')}
				>
					<input type="hidden" name="status" value={videoStatus} />
					<input type="hidden" name="visibility" value={videoVisibility} />
					<input type="hidden" name="collectionMode" value={videoCollectionMode} />
					<input
						type="hidden"
						name="existingVideoCollectionId"
						value={videoCollectionMode === 'existing' ? videoDestination : ''}
					/>
					<div class="modal-body modal-body--compact">
						<section class="collection-choice">
							<Select
								label="Video playlist"
								options={videoCollectionOptions}
								bind:value={videoDestination}
								required
							/>
						</section>

						<Input label="Video title" name="title" required />
						<label class="field">
							<span>Description</span>
							<textarea name="description" rows="4"></textarea>
						</label>
						<FileUpload
							label="Video file"
							name="video"
							accept="video/mp4,video/webm,video/quicktime"
							maxSize={250}
							required
							preview={false}
						/>

						{#if videoPublishStep}
							<div class="inline-overlay" role="dialog" aria-label="Publish video settings">
								<div class="inline-overlay__panel inline-overlay__panel--publish">
									<div class="inline-overlay__header">
										<button
											type="button"
											class="back-button"
											onclick={() => (videoPublishStep = false)}
										>
											<SvgIcon path={mdiArrowLeft} size={18} />
											Back
										</button>
										<IconButton
											path={mdiClose}
											label="Close publish settings"
											onClick={() => (videoPublishStep = false)}
										/>
									</div>
									<PublishPanel bind:status={videoStatus} bind:visibility={videoVisibility} />
									{#if submitError}
										<p class="submit-error" role="alert">{submitError}</p>
									{/if}
									<div class="publish-actions">
										<Button
											type="submit"
											variant="secondary"
											disabled={isSubmitting}
											onClick={() => (videoStatus = 'draft')}
										>
											{isSubmitting && videoStatus === 'draft' ? 'Saving...' : 'Save draft'}
										</Button>
										<Button
											type="submit"
											disabled={isSubmitting}
											onClick={() => (videoStatus = 'published')}
										>
											{isSubmitting && videoStatus === 'published' ? 'Publishing...' : 'Publish'}
										</Button>
									</div>
								</div>
							</div>
						{/if}
					</div>
					{#if !videoPublishStep}
						<footer class="modal-footer modal-footer--end">
							<Button type="button" disabled={isSubmitting} onClick={openVideoPublishStep}>
								Continue
							</Button>
						</footer>
					{/if}
				</form>
			{/if}

			<CollectionCreateOverlay
				open={galleryCreateOpen}
				title="Create gallery"
				submitLabel="Create gallery"
				onCreate={createPhotoAlbum}
				onCancel={() => (galleryCreateOpen = false)}
			/>
			<CollectionCreateOverlay
				open={videoCollectionCreateOpen}
				title="Create playlist"
				submitLabel="Create playlist"
				onCreate={createVideoCollection}
				onCancel={() => (videoCollectionCreateOpen = false)}
			/>
		</div>
	</div>
{/if}

<style lang="scss">
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-6);
		background: rgba(0, 0, 0, 0.5);
	}

	.backdrop-button {
		position: absolute;
		inset: 0;
		border: 0;
		background: transparent;
		cursor: default;
	}

	.composer-modal {
		position: relative;
		z-index: 1;
		width: min(880px, 100%);
		max-height: min(760px, calc(100vh - var(--space-12)));
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		overflow: hidden;
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-lg);
		background: var(--bg-surface);
		box-shadow: var(--shadow-xl);
	}

	.modal-header {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4) var(--space-5);
		border-bottom: 1px solid var(--border-primary);
		background: color-mix(in srgb, var(--bg-surface) 92%, var(--bg-secondary));
	}

	.identity {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: var(--space-3);

		h2,
		p {
			margin: 0;
		}

		h2 {
			color: var(--text-primary);
			font-size: var(--font-size-lg);
			line-height: 1.2;
		}

		p {
			margin-top: var(--space-1);
			color: var(--text-secondary);
			font-size: var(--font-size-xs);
		}
	}

	.avatar {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: var(--radius-full);
		background: var(--bg-tertiary);
		color: var(--text-primary);
		font-weight: var(--font-weight-semibold);
		flex-shrink: 0;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	form {
		min-height: 0;
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
	}

	.modal-body {
		position: relative;
		min-height: 0;
		display: grid;
		gap: var(--space-3);
		padding: var(--space-5) var(--space-6);
		overflow-y: auto;
	}

	.modal-body--post {
		overflow: hidden;
	}

	.modal-body--compact {
		max-width: 680px;
		width: 100%;
		margin: 0 auto;
	}

	.title-input {
		width: 100%;
		min-height: 52px;
		box-sizing: border-box;
		padding: 0;
		border: 0;
		border-bottom: 1px solid var(--border-primary);
		background: transparent;
		color: var(--text-primary);
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-medium);
		outline: none;

		&::placeholder {
			color: var(--text-tertiary);
			font-weight: var(--font-weight-normal);
		}

		&:focus {
			border-bottom-color: var(--border-focus);
		}
	}

	.inline-overlay {
		position: absolute;
		inset: 0;
		z-index: 4;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-6);
		background: color-mix(in srgb, var(--bg-primary) 58%, transparent);
		backdrop-filter: blur(2px);
	}

	.inline-overlay--hidden {
		display: none;
	}

	.inline-overlay__panel {
		width: min(620px, 100%);
		max-height: min(520px, 100%);
		overflow-y: auto;
		padding: var(--space-5);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-lg);
		background: var(--bg-surface);
		box-shadow: var(--shadow-xl);
	}

	.inline-overlay__panel--publish {
		width: min(460px, 100%);
	}

	.inline-overlay__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		margin-bottom: var(--space-4);

		h3 {
			margin: 0;
			color: var(--text-primary);
			font-size: var(--font-size-lg);
		}
	}

	.inline-overlay__actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.remove-widget {
		min-height: 40px;
		padding: 0 var(--space-3);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: var(--font-size-sm);

		&:hover {
			border-color: var(--error);
			color: var(--error);
		}
	}

	.widget-panel--hidden {
		display: none;
	}

	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-5);
		border-top: 1px solid var(--border-primary);
		background: color-mix(in srgb, var(--bg-surface) 92%, var(--bg-secondary));
	}

	.modal-footer--end {
		justify-content: flex-end;
	}

	.composer-tools {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-width: 0;
	}

	.tool-divider {
		width: 1px;
		height: 32px;
		background: var(--border-primary);
	}

	.widget-toolbar,
	.submit-area {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.back-button {
		min-height: 40px;
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		border: 0;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		font-weight: var(--font-weight-medium);
	}

	.publish-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-top: var(--space-5);
	}

	.submit-error {
		margin: var(--space-4) 0 0;
		padding: var(--space-3);
		border: 1px solid color-mix(in srgb, var(--error) 40%, transparent);
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--error) 10%, transparent);
		color: var(--error);
		font-size: var(--font-size-sm);
		line-height: 1.4;
	}

	.media-upload-progress {
		display: grid;
		gap: var(--space-2);
		padding: var(--space-3);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-md);
		background: var(--bg-secondary);

		progress {
			width: 100%;
			height: 8px;
			border: 0;
			border-radius: var(--radius-full);
			overflow: hidden;
		}

		progress::-webkit-progress-bar {
			background: var(--bg-tertiary);
		}

		progress::-webkit-progress-value {
			background: var(--primary);
		}
	}

	.media-upload-progress__meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		color: var(--text-secondary);
		font-size: var(--font-size-xs);

		strong {
			color: var(--text-primary);
			font-variant-numeric: tabular-nums;
		}
	}

	.field {
		display: grid;
		gap: var(--space-2);

		span {
			color: var(--text-primary);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
		}

		textarea {
			width: 100%;
			box-sizing: border-box;
			padding: var(--space-3) var(--space-4);
			border: 1px solid var(--border-primary);
			border-radius: var(--radius-md);
			background: var(--bg-surface);
			color: var(--text-primary);
			font-family: var(--font-family-sans);
			font-size: var(--font-size-sm);
			resize: vertical;

			&:focus {
				outline: none;
				border-color: var(--border-focus);
			}
		}
	}

	.collection-choice {
		display: grid;
		gap: var(--space-4);
	}

	@media (max-width: 760px) {
		.modal-backdrop {
			align-items: stretch;
			padding: var(--space-3);
		}

		.composer-modal {
			max-height: 100%;
		}

		.modal-footer {
			align-items: stretch;
			flex-direction: column;
		}

		.composer-tools {
			flex-wrap: wrap;
		}

		.widget-toolbar,
		.submit-area {
			justify-content: space-between;
		}
	}
</style>
