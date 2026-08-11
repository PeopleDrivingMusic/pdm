<script lang="ts">
	import { mdiPencilOutline, mdiTrashCanOutline, mdiDotsVertical } from '@mdi/js';
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
	// Which row has its overflow menu open (only ever one).
	let menuId = $state<string | null>(null);

	// Close the overflow menu on an outside click or Escape. The click handler tests
	// the target rather than relying on stopPropagation, so the very click that opens
	// the menu (and clicks on its own items) can't race it shut.
	$effect(() => {
		if (!menuId) return;
		const onClick = (event: MouseEvent) => {
			const target = event.target as Element | null;
			if (!target?.closest?.('.menu-wrap')) menuId = null;
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') menuId = null;
		};
		document.addEventListener('click', onClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onClick);
			document.removeEventListener('keydown', onKey);
		};
	});

	function toggleMenu(id: string) {
		menuId = menuId === id ? null : id;
	}

	function startEdit(message: Message) {
		editingId = message.id;
		draft = message.body;
		menuId = null;
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

					{#if (message.canEdit || message.canDelete) && editingId !== message.id}
						<div class="menu-wrap">
							<button
								type="button"
								class="menu-trigger"
								aria-label="More actions"
								aria-haspopup="true"
								aria-expanded={menuId === message.id}
								onclick={() => toggleMenu(message.id)}
							>
								<SvgIcon path={mdiDotsVertical} size={16} />
							</button>

							{#if menuId === message.id}
								<div class="menu">
									{#if message.canEdit}
										<button type="button" onclick={() => startEdit(message)}>
											<SvgIcon path={mdiPencilOutline} size={16} />
											<span>Edit comment</span>
										</button>
									{/if}
									{#if message.canDelete}
										<button
											type="button"
											class="danger"
											onclick={() => {
												menuId = null;
												onDelete?.(message.id);
											}}
										>
											<SvgIcon path={mdiTrashCanOutline} size={16} />
											<span>Delete comment</span>
										</button>
									{/if}
								</div>
							{/if}
						</div>
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
		position: relative;
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
	}

	.message-body {
		min-width: 0;
		flex: 1;
		// Reserve the overflow trigger's lane so long names/text never slide under it.
		padding-right: 32px;
	}

	.message-meta {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
	}

	// Pinned to the row's top-right and taken out of the flow: in-flow it would
	// stretch `.message-meta` to the trigger's height, so rows with actions sat
	// taller than rows without and the author/body baselines drifted between them.
	.menu-wrap {
		position: absolute;
		top: 0;
		right: 0;
	}

	.menu-trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		// The visual button stays compact; the tap area is extended to 44px.
		&::after {
			content: '';
			position: absolute;
			inset: -8px;
		}

		&:hover,
		&[aria-expanded='true'] {
			color: var(--text-primary);
			background: color-mix(in srgb, var(--bg-surface) 78%, transparent);
		}
	}

	.menu {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		z-index: 30;
		min-width: 170px;
		padding: var(--space-1);
		display: flex;
		flex-direction: column;
		border: 1px solid color-mix(in srgb, var(--border-primary) 62%, transparent);
		border-radius: var(--radius-md);
		background: var(--bg-surface);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.32);

		button {
			display: flex;
			align-items: center;
			gap: var(--space-2);
			width: 100%;
			min-height: 40px;
			padding: 0 var(--space-2);
			border: none;
			border-radius: var(--radius-sm, 6px);
			background: transparent;
			color: var(--text-primary);
			font: inherit;
			font-size: var(--font-size-sm);
			text-align: left;
			cursor: pointer;

			&:hover {
				background: color-mix(in srgb, var(--bg-primary) 60%, transparent);
			}

			&.danger {
				color: var(--error, #e5484d);
			}
		}
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
</style>
