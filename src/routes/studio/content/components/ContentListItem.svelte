<script lang="ts">
	import {
		mdiCalendarClock,
		mdiCheckCircleOutline,
		mdiDeleteOutline,
		mdiFileDocumentEditOutline,
		mdiImageMultipleOutline,
		mdiVideoOutline
	} from '@mdi/js';
	import { IconButton, SvgIcon } from '$lib/ui';

	interface FeedItem {
		id: string;
		sourceType: string;
		title: string;
		previewText: string | null;
		coverUrl: string | null;
		visibility: string;
		status: string;
		publishedAt: Date | string | null;
		scheduledAt: Date | string | null;
		createdAt: Date | string;
	}

	interface Props {
		item: FeedItem;
		onEdit?: (item: FeedItem) => void;
		onPublish?: (item: FeedItem) => void;
		onDelete?: (item: FeedItem) => void;
	}

	let { item, onEdit, onPublish, onDelete }: Props = $props();

	const canManageCollection = $derived(
		item.sourceType === 'photo_album' || item.sourceType === 'video_collection'
	);

	const typeMeta = $derived.by(() => {
		if (item.sourceType === 'photo_album')
			return { label: 'Gallery', icon: mdiImageMultipleOutline };
		if (item.sourceType === 'video_collection')
			return { label: 'Video playlist', icon: mdiVideoOutline };
		if (item.sourceType === 'video') return { label: 'Video', icon: mdiVideoOutline };
		return { label: 'Post', icon: mdiFileDocumentEditOutline };
	});

	function formatDate(value: Date | string | null) {
		if (!value) return 'Not scheduled';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return 'Not scheduled';
		return new Intl.DateTimeFormat('en', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}
</script>

<article class="content-item">
	<div class="preview" aria-hidden="true">
		{#if item.coverUrl}
			<img src={item.coverUrl} alt="" loading="lazy" />
		{:else}
			<SvgIcon path={typeMeta.icon} size={28} />
		{/if}
	</div>

	<div class="body">
		<div class="meta">
			<span class="type"><SvgIcon path={typeMeta.icon} size={15} /> {typeMeta.label}</span>
			<span class="status status--{item.status}">{item.status}</span>
			<span class="visibility">{item.visibility}</span>
		</div>
		<h2>{item.title}</h2>
		<p>{item.previewText || 'No preview text yet.'}</p>
	</div>

	<div class="schedule">
		<SvgIcon path={mdiCalendarClock} size={17} />
		<span>{formatDate(item.scheduledAt || item.publishedAt || item.createdAt)}</span>
	</div>

	<div class="actions">
		{#if canManageCollection}
			{#if item.status !== 'published'}
				<IconButton
					path={mdiCheckCircleOutline}
					label="Publish"
					onClick={() => onPublish?.(item)}
				/>
			{/if}
			<IconButton path={mdiFileDocumentEditOutline} label="Edit" onClick={() => onEdit?.(item)} />
			<IconButton path={mdiDeleteOutline} label="Delete" onClick={() => onDelete?.(item)} />
		{:else}
			<IconButton path={mdiFileDocumentEditOutline} label="Open editor" disabled />
		{/if}
	</div>
</article>

<style lang="scss">
	.content-item {
		display: grid;
		grid-template-columns: 72px minmax(0, 1fr) minmax(150px, auto) auto;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-md);
		background: var(--bg-surface);
	}

	.preview {
		width: 72px;
		height: 72px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: var(--radius-md);
		background: var(--bg-tertiary);
		color: var(--text-tertiary);

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.body {
		min-width: 0;

		h2 {
			margin: var(--space-1) 0;
			color: var(--text-primary);
			font-size: var(--font-size-lg);
			line-height: 1.25;
		}

		p {
			margin: 0;
			color: var(--text-secondary);
			font-size: var(--font-size-sm);
			line-height: 1.45;
			overflow: hidden;
			display: -webkit-box;
			line-clamp: 2;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
		}
	}

	.meta,
	.schedule {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.meta {
		flex-wrap: wrap;
	}

	.type,
	.status,
	.visibility {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
		color: var(--text-secondary);
		font-size: var(--font-size-xs);
		text-transform: capitalize;
	}

	.status--published {
		background: color-mix(in srgb, var(--success) 14%, transparent);
		color: var(--success);
	}

	.status--scheduled {
		background: color-mix(in srgb, var(--info) 14%, transparent);
		color: var(--info);
	}

	.schedule {
		color: var(--text-secondary);
		font-size: var(--font-size-xs);
		white-space: nowrap;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
	}

	@media (max-width: 760px) {
		.content-item {
			grid-template-columns: 56px minmax(0, 1fr);
		}

		.preview {
			width: 56px;
			height: 56px;
		}

		.schedule,
		.actions {
			grid-column: 2;
			justify-content: flex-start;
		}
	}
</style>
