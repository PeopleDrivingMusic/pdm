<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import { Button } from '$lib/ui';
	import Modal from '$lib/ui/components/Modal/Modal.svelte';

	let { show = $bindable(false) }: { show: boolean } = $props();

	let message = $state('');
	let submitting = $state(false);
	let error = $state('');
	let sent = $state(false);

	function handleSubmit() {
		submitting = true;
		error = '';
		return async ({ result }: { result: ActionResult }) => {
			submitting = false;
			if (result.type === 'success') {
				sent = true;
			} else {
				error =
					result.type === 'failure' && typeof result.data?.error === 'string'
						? result.data.error
						: 'Something went wrong. Please try again.';
			}
		};
	}

	function handleClose() {
		message = '';
		error = '';
		sent = false;
	}
</script>

<Modal bind:show title="Claim this page" onclose={handleClose}>
	{#if sent}
		<p class="claim-sent">
			Request sent. We will reach out to verify you're the artist before handing anything over.
		</p>
	{:else}
		<form method="POST" action="?/claimArtist" use:enhance={handleSubmit}>
			<label for="claim-message">Message (optional)</label>
			<textarea
				id="claim-message"
				name="message"
				bind:value={message}
				rows="4"
				placeholder="Tell us how we can verify this is you."
			></textarea>
			{#if error}
				<p class="claim-error" role="alert">{error}</p>
			{/if}
			<Button type="submit" disabled={submitting}>
				{submitting ? 'Sending…' : 'Send request'}
			</Button>
		</form>
	{/if}
</Modal>

<style lang="scss">
	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	label {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--text-primary);
	}

	textarea {
		width: 100%;
		resize: vertical;
		padding: var(--space-3);
		border-radius: var(--radius-md);
		border: 1px solid var(--border-primary);
		background: var(--bg-primary);
		color: var(--text-primary);
		font: inherit;

		&:focus-visible {
			outline: 2px solid var(--primary);
			outline-offset: 1px;
		}
	}

	.claim-error {
		margin: 0;
		color: var(--error, #e5484d);
		font-size: var(--font-size-sm);
	}

	.claim-sent {
		margin: 0;
		color: var(--text-secondary);
	}
</style>
