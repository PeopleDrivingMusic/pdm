<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/ui/components/Modal/Modal.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Button from '$lib/ui/Button.svelte';
	import VisibilityToggle from '$lib/ui/VisibilityToggle.svelte';
	import { notificationStore } from '$lib/stores/notification.svelte';
	import type { TrackDTO } from '$lib/server/music';

	let {
		open = $bindable(),
		track = null
	}: {
		open: boolean;
		track?: TrackDTO | null;
	} = $props();

	let title = $state('');
	let genres = $state('');
	let visibility = $state<'public' | 'subscribers'>('public');
	let isPublished = $state(false);
	let submitting = $state(false);

	$effect(() => {
		if (open && track) {
			title = track.title;
			genres = track.genres.join(', ');
			visibility = track.visibility;
			isPublished = track.isPublished;
		}
	});
</script>

<Modal bind:show={open} title="Edit track">
	<form
		method="POST"
		action="?/updateTrack"
		use:enhance={() => {
			submitting = true;
			return async ({ result, update }) => {
				submitting = false;
				if (result.type === 'success') {
					notificationStore.success('Track updated');
					open = false;
					await invalidateAll();
				} else if (result.type === 'failure') {
					notificationStore.error(
						(result.data as { error?: string } | undefined)?.error ?? 'Could not save track'
					);
				}
				await update({ reset: false });
			};
		}}
		class="form"
	>
		{#if track}<input type="hidden" name="trackId" value={track.id} />{/if}
		<Input label="Track title" name="title" bind:value={title} required />
		<Input
			label="Genres"
			name="genres"
			bind:value={genres}
			placeholder="Rock, Pop (comma-separated)"
		/>
		<div class="field">
			<span class="label">Visibility</span>
			<VisibilityToggle bind:value={visibility} level="track" />
			<input type="hidden" name="visibility" value={visibility} />
		</div>
		<label class="check">
			<input type="checkbox" name="isPublished" value="true" bind:checked={isPublished} />
			Published
		</label>
		<div class="actions">
			<Button type="button" variant="secondary" onClick={() => (open = false)}>Cancel</Button>
			<Button type="submit" disabled={submitting}>Save</Button>
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
		.label {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--text-primary);
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
