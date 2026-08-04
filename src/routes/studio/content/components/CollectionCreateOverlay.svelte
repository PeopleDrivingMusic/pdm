<script lang="ts">
	import { mdiClose } from '@mdi/js';
	import { Button, IconButton, Input, Select } from '$lib/ui';
	import type { ContentStatus, ContentVisibility } from '$lib/db/content-visibility';

	type Visibility = ContentVisibility;
	type Status = ContentStatus;

	interface Payload {
		title: string;
		description: string;
		visibility: Visibility;
		status?: Status;
	}

	interface Props {
		open: boolean;
		title: string;
		submitLabel: string;
		initialTitle?: string;
		initialDescription?: string | null;
		initialVisibility?: Visibility;
		initialStatus?: Status;
		showStatus?: boolean;
		deleteLabel?: string;
		onCreate: (payload: Payload) => Promise<void>;
		onCancel: () => void;
		onDelete?: () => Promise<void>;
	}

	let {
		open,
		title,
		submitLabel,
		initialTitle = '',
		initialDescription = '',
		initialVisibility = 'public',
		initialStatus = 'draft',
		showStatus = false,
		deleteLabel = '',
		onCreate,
		onCancel,
		onDelete
	}: Props = $props();

	let itemTitle = $state('');
	let description = $state('');
	let visibility = $state<Visibility>('public');
	let status = $state<Status>('draft');
	let isSubmitting = $state(false);
	let isDeleting = $state(false);
	let error = $state('');

	const visibilityOptions = [
		{ label: 'Public', value: 'public' },
		{ label: 'Subscribers', value: 'subscribers' }
	];
	const statusOptions = [
		{ label: 'Draft', value: 'draft' },
		{ label: 'Published', value: 'published' },
		{ label: 'Archived', value: 'archived' }
	];

	$effect(() => {
		if (open) {
			itemTitle = initialTitle;
			description = initialDescription ?? '';
			visibility = initialVisibility;
			status = initialStatus;
			error = '';
			return;
		}

		itemTitle = '';
		description = '';
		visibility = 'public';
		status = 'draft';
		isSubmitting = false;
		isDeleting = false;
		error = '';
	});

	async function submit() {
		const normalizedTitle = itemTitle.trim();
		if (!normalizedTitle) {
			error = 'Title is required';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			await onCreate({
				title: normalizedTitle,
				description: description.trim(),
				visibility,
				status: showStatus ? status : undefined
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not create it right now';
		} finally {
			isSubmitting = false;
		}
	}

	async function deleteItem() {
		if (!onDelete) return;
		const confirmed = window.confirm(`Delete "${itemTitle}"? This cannot be undone.`);
		if (!confirmed) return;

		isDeleting = true;
		error = '';

		try {
			await onDelete();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not delete it right now';
		} finally {
			isDeleting = false;
		}
	}
</script>

{#if open}
	<div class="create-overlay" role="dialog" aria-modal="true" aria-label={title}>
		<div class="create-panel">
			<header class="create-header">
				<h3>{title}</h3>
				<IconButton path={mdiClose} label="Close create form" onClick={onCancel} />
			</header>

			<div class="create-fields">
				<Input label="Title" bind:value={itemTitle} required disabled={isSubmitting} />
				<label class="field">
					<span>Description</span>
					<textarea bind:value={description} rows="3" disabled={isSubmitting}></textarea>
				</label>
				<Select
					label="Visibility"
					options={visibilityOptions}
					bind:value={visibility}
					disabled={isSubmitting || isDeleting}
				/>
				{#if showStatus}
					<Select
						label="Status"
						options={statusOptions}
						bind:value={status}
						disabled={isSubmitting || isDeleting}
					/>
				{/if}
			</div>

			{#if error}
				<p class="create-error" role="alert">{error}</p>
			{/if}

			<footer class="create-actions">
				{#if onDelete}
					<button
						class="delete-action"
						type="button"
						disabled={isSubmitting || isDeleting}
						onclick={deleteItem}
					>
						{isDeleting ? 'Deleting...' : deleteLabel || 'Delete'}
					</button>
				{/if}
				<div class="create-actions__main">
					<Button
						variant="secondary"
						type="button"
						disabled={isSubmitting || isDeleting}
						onClick={onCancel}
					>
						Cancel
					</Button>
					<Button type="button" disabled={isSubmitting || isDeleting} onClick={submit}>
						{isSubmitting ? `${submitLabel}...` : submitLabel}
					</Button>
				</div>
			</footer>
		</div>
	</div>
{/if}

<style lang="scss">
	.create-overlay {
		position: absolute;
		inset: 0;
		z-index: 6;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-5);
		background: color-mix(in srgb, var(--bg-primary) 56%, transparent);
		backdrop-filter: blur(2px);
	}

	.create-panel {
		width: min(420px, 100%);
		padding: var(--space-5);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-lg);
		background: var(--bg-surface);
		box-shadow: var(--shadow-xl);
	}

	.create-header {
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

	.create-fields {
		display: grid;
		gap: var(--space-4);
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

			&:disabled {
				cursor: not-allowed;
				opacity: 0.6;
			}
		}
	}

	.create-error {
		margin: var(--space-4) 0 0;
		color: var(--error);
		font-size: var(--font-size-sm);
	}

	.create-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		margin-top: var(--space-5);
	}

	.create-actions__main {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
	}

	.delete-action {
		min-height: 40px;
		padding: 0 var(--space-3);
		border: 1px solid color-mix(in srgb, var(--error) 45%, transparent);
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--error);
		cursor: pointer;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);

		&:disabled {
			cursor: not-allowed;
			opacity: 0.6;
		}
	}
</style>
