<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/ui/components/Modal/Modal.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Button from '$lib/ui/Button.svelte';
	import { notificationStore } from '$lib/stores/notification.svelte';
	import type { AlbumDTO } from '$lib/server/music';

	let {
		open = $bindable(),
		trackId = '',
		albums = []
	}: {
		open: boolean;
		trackId?: string;
		albums?: AlbumDTO[];
	} = $props();

	let submitting = $state(false);
</script>

<Modal bind:show={open} title="Link track to album">
	<form
		method="POST"
		action="?/linkTrackToAlbum"
		use:enhance={() => {
			submitting = true;
			return async ({ result, update }) => {
				submitting = false;
				if (result.type === 'success') {
					notificationStore.success('Track linked to album');
					open = false;
					await invalidateAll();
				} else if (result.type === 'failure') {
					notificationStore.error(
						(result.data as { error?: string } | undefined)?.error ?? 'Could not link track'
					);
				}
				await update({ reset: false });
			};
		}}
		class="form"
	>
		<input type="hidden" name="trackId" value={trackId} />
		<div class="field">
			<label for="link-album">Album</label>
			<select id="link-album" name="albumId" required>
				<option value="">Choose an album…</option>
				{#each albums as album (album.id)}
					<option value={album.id}>{album.title}</option>
				{/each}
			</select>
		</div>
		<Input label="Track number" name="trackNumber" type="number" min={1} placeholder="1" required />
		<div class="actions">
			<Button type="button" variant="secondary" onClick={() => (open = false)}>Cancel</Button>
			<Button type="submit" disabled={submitting}>Link</Button>
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
		label {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--text-primary);
		}
		select {
			width: 100%;
			padding: var(--space-3);
			border: 1px solid var(--border-primary);
			border-radius: var(--radius-md);
			background: var(--bg-surface);
			color: var(--text-primary);
			&:focus {
				outline: none;
				border-color: var(--border-focus);
			}
		}
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-top: var(--space-2);
	}
</style>
