<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import { Button, Textarea } from '$lib/ui';
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
			<Textarea
				label="Message (optional)"
				name="message"
				bind:value={message}
				rows={4}
				placeholder="Tell us how we can verify this is you."
			/>
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
