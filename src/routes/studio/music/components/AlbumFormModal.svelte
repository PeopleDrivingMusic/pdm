<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/ui/components/Modal/Modal.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Button from '$lib/ui/Button.svelte';
	import FileUpload from '$lib/ui/FileUpload.svelte';
	import VisibilityToggle from '$lib/ui/VisibilityToggle.svelte';
	import { notificationStore } from '$lib/stores/notification.svelte';
	import { uploadR2Target, type ClientMediaUploadTarget } from '$lib/utils/helpers';
	import type { AlbumDTO } from '$lib/server/music';

	let {
		open = $bindable(),
		album = null
	}: {
		open: boolean;
		album?: AlbumDTO | null;
	} = $props();

	let title = $state('');
	let description = $state('');
	let releaseDate = $state('');
	let genres = $state('');
	let visibility = $state<'public' | 'subscribers_only'>('public');
	let isPublished = $state(false);
	let coverFile = $state<File | null>(null);
	let submitting = $state(false);

	// Reset form whenever the modal opens for a (possibly different) album.
	$effect(() => {
		if (open) {
			title = album?.title ?? '';
			description = album?.description ?? '';
			releaseDate = album?.releaseDate ? album.releaseDate.split('T')[0] : '';
			genres = album?.genres?.join(', ') ?? '';
			visibility = album?.visibility ?? 'public';
			isPublished = album?.isPublished ?? false;
			coverFile = null;
		}
	});

	async function uploadCover(albumId: string, file: File) {
		const res = await fetch('/api/studio/media/upload-target', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				kind: 'album-cover',
				albumId,
				fileName: file.name,
				contentType: file.type,
				size: file.size
			})
		});
		if (!res.ok) throw new Error('Could not prepare cover upload');
		const { upload } = (await res.json()) as { upload: ClientMediaUploadTarget };
		await uploadR2Target({ file, upload });
	}
</script>

<Modal bind:show={open} title={album ? 'Edit album' : 'Create album'}>
	<form
		method="POST"
		action={album ? '?/updateAlbum' : '?/createAlbum'}
		use:enhance={() => {
			submitting = true;
			const file = coverFile;
			return async ({ result, update }) => {
				submitting = false;
				if (result.type === 'success') {
					const created = (result.data as { album?: AlbumDTO } | undefined)?.album;
					if (file && created?.id) {
						try {
							await uploadCover(created.id, file);
						} catch (e) {
							notificationStore.error(e instanceof Error ? e.message : 'Cover upload failed');
						}
					}
					notificationStore.success(album ? 'Album updated' : 'Album created');
					open = false;
					await invalidateAll();
				} else if (result.type === 'failure') {
					notificationStore.error(
						(result.data as { error?: string } | undefined)?.error ?? 'Could not save album'
					);
				}
				await update({ reset: false });
			};
		}}
		class="form"
	>
		{#if album}<input type="hidden" name="albumId" value={album.id} />{/if}
		<Input label="Album title" name="title" bind:value={title} required placeholder="Album title" />
		<div class="field">
			<label for="album-desc">Description</label>
			<textarea id="album-desc" name="description" bind:value={description} rows="3"></textarea>
		</div>
		<Input label="Release date" name="releaseDate" type="date" bind:value={releaseDate} />
		<Input
			label="Genres"
			name="genres"
			bind:value={genres}
			placeholder="Rock, Pop (comma-separated)"
		/>
		<div class="field">
			<span class="label">Visibility</span>
			<VisibilityToggle bind:value={visibility} level="album" />
			<input type="hidden" name="visibility" value={visibility} />
		</div>
		<FileUpload
			label="Cover image"
			name="coverImageDisplay"
			accept="image/*"
			bind:value={coverFile}
			maxSize={10}
			helpText="JPG, PNG or WebP · max 10MB"
		/>
		{#if album}
			<label class="check">
				<input type="checkbox" name="isPublished" value="true" bind:checked={isPublished} />
				Published
			</label>
		{/if}
		<div class="actions">
			<Button type="button" variant="secondary" onClick={() => (open = false)}>Cancel</Button>
			<Button type="submit" disabled={submitting}>{album ? 'Save' : 'Create'}</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding-top: var(--space-4);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		.label,
		label {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--text-primary);
		}
		textarea {
			width: 100%;
			padding: var(--space-3);
			border: 1px solid var(--border-primary);
			border-radius: var(--radius-md);
			background: var(--bg-surface);
			color: var(--text-primary);
			font-family: inherit;
			resize: vertical;
			&:focus {
				outline: none;
				border-color: var(--border-focus);
			}
		}
	}
	.check {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
		color: var(--text-primary);
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-top: var(--space-2);
	}
</style>
