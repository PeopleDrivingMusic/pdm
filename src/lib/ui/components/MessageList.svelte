<script lang="ts">
	import { mdiPencilOutline, mdiTrashCanOutline } from '@mdi/js';
	import Avatar from '../Avatar.svelte';
	import SvgIcon from '../SvgIcon.svelte';
	import Button from '../Button.svelte';

	export interface MessageAuthor {
		id: string;
		name: string;
		avatar: string | null;
	}

	export interface Message {
		id: string;
		body: string;
		createdAt: string;
		editedAt: string | null;
		author: MessageAuthor;
		isArtist: boolean;
		canDelete: boolean;
		canEdit: boolean;
	}

	let {
		messages,
		onEdit,
		onDelete
	}: {
		messages: Message[];
		onEdit?: (id: string, body: string) => Promise<void> | void;
		onDelete?: (id: string) => Promise<void> | void;
	} = $props();

	// Which row is currently in edit mode, plus its draft.
	let editingId = $state<string | null>(null);
	let draft = $state('');
	let busy = $state(false);

	function startEdit(message: Message) {
		editingId = message.id;
		draft = message.body;
	}

	function cancelEdit() {
		editingId = null;
		draft = '';
	}

	async function saveEdit(id: string) {
		const next = draft.trim();
		if (!next || busy) return;
		busy = true;
		try {
			await onEdit?.(id, next);
			cancelEdit();
		} finally {
			busy = false;
		}
	}

	function relativeTime(iso: string) {
		const then = new Date(iso).getTime();
		if (Number.isNaN(then)) return '';
		const seconds = Math.round((Date.now() - then) / 1000);
		if (seconds < 60) return 'just now';
		const minutes = Math.round(seconds / 60);
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `${hours}h`;
		return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(iso));
	}
</script>

<ul class="message-list">
	{#each messages as message (message.id)}
		<li class="message">
			<Avatar size="s" src={message.author.avatar} name={message.author.name} />

			<div class="message-body">
				<div class="message-meta">
					<span class="author">{message.author.name}</span>
					{#if message.isArtist}
						<span class="artist-badge">Artist</span>
					{/if}
					<span class="time">{relativeTime(message.createdAt)}</span>
					{#if message.editedAt}
						<span class="edited">(edited)</span>
					{/if}
				</div>

				{#if editingId === message.id}
					<div class="edit-row">
						<textarea bind:value={draft} rows="2" aria-label="Edit comment"></textarea>
						<div class="edit-actions">
							<Button
								size="sm"
								onClick={() => saveEdit(message.id)}
								disabled={busy || !draft.trim()}
							>
								Save
							</Button>
							<Button size="sm" variant="secondary" onClick={cancelEdit} disabled={busy}>
								Cancel
							</Button>
						</div>
					</div>
				{:else}
					<!-- Plain text on purpose: never {@html} user input. -->
					<p class="text">{message.body}</p>
				{/if}
			</div>

			{#if (message.canEdit || message.canDelete) && editingId !== message.id}
				<div class="row-actions">
					{#if message.canEdit}
						<button type="button" aria-label="Edit comment" onclick={() => startEdit(message)}>
							<SvgIcon path={mdiPencilOutline} size={16} />
						</button>
					{/if}
					{#if message.canDelete}
						<button
							type="button"
							aria-label="Delete comment"
							onclick={() => onDelete?.(message.id)}
						>
							<SvgIcon path={mdiTrashCanOutline} size={16} />
						</button>
					{/if}
				</div>
			{/if}
		</li>
	{/each}
</ul>

<style lang="scss">
	.message-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.message {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
	}

	.message-body {
		min-width: 0;
		flex: 1;
	}

	.message-meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-2);
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
	}

	.author {
		font-weight: 600;
		color: var(--text-primary);
	}

	.artist-badge {
		padding: 1px 6px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--primary) 22%, transparent);
		color: var(--primary);
		font-weight: 700;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.text {
		margin: var(--space-1) 0 0;
		color: var(--text-primary);
		font-size: var(--font-size-sm);
		line-height: 1.45;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.edit-row {
		margin-top: var(--space-2);

		textarea {
			width: 100%;
			padding: var(--space-2);
			border: 1px solid color-mix(in srgb, var(--border-primary) 62%, transparent);
			border-radius: var(--radius-md);
			background: var(--bg-surface);
			color: var(--text-primary);
			font: inherit;
			font-size: var(--font-size-sm);
			resize: vertical;
		}
	}

	.edit-actions {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}

	.row-actions {
		display: flex;
		gap: var(--space-1);
		flex-shrink: 0;

		button {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			// Comfortable tap target on touch screens.
			min-width: 44px;
			min-height: 44px;
			border: none;
			border-radius: var(--radius-md);
			background: transparent;
			color: var(--text-secondary);
			cursor: pointer;

			&:hover {
				color: var(--text-primary);
				background: color-mix(in srgb, var(--bg-surface) 70%, transparent);
			}
		}
	}
</style>
