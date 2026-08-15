<script lang="ts">
	import { mdiPencilOutline, mdiTrashCanOutline, mdiHeart, mdiHeartOutline } from '@mdi/js';
	import Avatar from '../Avatar.svelte';
	import SvgIcon from '../SvgIcon.svelte';
	import Button from '../Button.svelte';
	import Menu from '../Menu.svelte';

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
		likeCount: number;
		likedByViewer: boolean;
	}

	let {
		messages,
		onEdit,
		onDelete,
		onToggleLike
	}: {
		messages: Message[];
		/** Resolve `false` to reject the edit — the row stays open with the draft. */
		onEdit?: (id: string, body: string) => Promise<boolean | void> | boolean | void;
		onDelete?: (id: string) => Promise<void> | void;
		onToggleLike?: (id: string) => Promise<void> | void;
	} = $props();

	// Which row is currently in edit mode, plus its draft.
	let editingId = $state<string | null>(null);
	let draft = $state('');
	let busy = $state(false);
	let editField = $state<HTMLTextAreaElement | null>(null);

	// Focus the editor as it opens — otherwise a keyboard user has to tab back from
	// the top of the document to reach the field they just asked for.
	$effect(() => {
		if (editingId && editField) editField.focus();
	});

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
			// Close only on success; a refusal keeps the editor and the draft so the
			// author can correct it instead of retyping from the original body.
			const accepted = await onEdit?.(id, next);
			if (accepted !== false) cancelEdit();
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
						<div class="menu-slot">
							<Menu
								label="More actions"
								items={[
									...(message.canEdit
										? [{ key: 'edit', label: 'Edit comment', icon: mdiPencilOutline }]
										: []),
									...(message.canDelete
										? [
												{
													key: 'delete',
													label: 'Delete comment',
													icon: mdiTrashCanOutline,
													danger: true
												}
											]
										: [])
								]}
								onSelect={(key) => {
									if (key === 'edit') startEdit(message);
									if (key === 'delete') onDelete?.(message.id);
								}}
							/>
						</div>
					{/if}
				</div>

				{#if editingId === message.id}
					<div class="edit-row">
						<textarea bind:this={editField} bind:value={draft} rows="2" aria-label="Edit comment"
						></textarea>
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

					<!-- Row actions. Reply slots in here next to the like. -->
					<div class="row-actions">
						<button
							type="button"
							class="like"
							class:is-liked={message.likedByViewer}
							aria-label={message.likedByViewer ? 'Unlike comment' : 'Like comment'}
							aria-pressed={message.likedByViewer}
							disabled={!onToggleLike}
							onclick={() => onToggleLike?.(message.id)}
						>
							<SvgIcon path={message.likedByViewer ? mdiHeart : mdiHeartOutline} size={14} />
							{#if message.likeCount > 0}
								<span>{message.likeCount}</span>
							{/if}
						</button>
					</div>
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
	.menu-slot {
		position: absolute;
		top: 0;
		right: 0;
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

	// Reply and other per-message actions join this row later. The negative inset
	// cancels the first button's padding so the row lines up with the body text
	// instead of sitting indented under it.
	.row-actions {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		margin-top: 2px;
		margin-left: calc(var(--space-1) * -1);
	}

	.like {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		height: 24px;
		padding: 0 var(--space-1);
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		// Quieter than the body/author text by default — a comment row shouldn't
		// compete with its own reaction button. Liked/hover states still stand out.
		color: var(--text-tertiary);
		font-size: var(--font-size-xs);
		cursor: pointer;
		// Compact visually, still a 44px tap target.
		position: relative;
		&::after {
			content: '';
			position: absolute;
			inset: -8px;
		}

		&:hover:not(:disabled) {
			color: var(--text-primary);
		}

		&.is-liked {
			color: var(--primary);
		}

		// No handler means no signed-in viewer — same disabled treatment as the
		// post-level like button, so the row stops implying an action that would
		// silently do nothing.
		// TODO(#19?): route this to a login modal instead of just disabling.
		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}
</style>
