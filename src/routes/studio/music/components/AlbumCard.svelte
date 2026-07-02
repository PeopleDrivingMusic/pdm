<script lang="ts">
	import { mdiAlbum, mdiPencil, mdiDelete, mdiLinkOff } from '@mdi/js';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import Badge from '$lib/ui/Badge.svelte';
	import { resolveR2ImageUrl } from '$lib/utils/helpers';
	import type { AlbumDTO } from '$lib/server/music';

	type LinkedTrack = { trackId: string; trackNumber: number; title: string };

	let {
		album,
		linkedTracks = [],
		onEdit,
		onDelete,
		onUnlinkTrack
	}: {
		album: AlbumDTO;
		linkedTracks?: LinkedTrack[];
		onEdit: (album: AlbumDTO) => void;
		onDelete: (album: AlbumDTO) => void;
		onUnlinkTrack: (albumId: string, trackId: string) => void;
	} = $props();

	const cover = $derived(resolveR2ImageUrl(album.coverImageKey));
	const releaseLabel = $derived(
		album.releaseDate
			? new Date(album.releaseDate).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'short',
					day: 'numeric'
				})
			: null
	);
</script>

<article class="album-card">
	<div class="cover">
		{#if cover}
			<img src={cover} alt={album.title} loading="lazy" />
		{:else}
			<div class="cover-placeholder"><SvgIcon path={mdiAlbum} size={40} /></div>
		{/if}
		{#if album.visibility === 'subscribers_only'}
			<span class="badge-tl"><Badge variant="gate" label="Subscribers" /></span>
		{/if}
		<span class="badge-tr">
			<Badge
				variant={album.isPublished ? 'published' : 'draft'}
				label={album.isPublished ? 'Published' : 'Draft'}
			/>
		</span>
	</div>

	<div class="body">
		<h3 class="title">{album.title}</h3>
		{#if album.description}<p class="desc">{album.description}</p>{/if}
		<div class="meta">
			{#if releaseLabel}<span>{releaseLabel}</span>{/if}
			<span class="count">{linkedTracks.length} track{linkedTracks.length === 1 ? '' : 's'}</span>
		</div>

		{#if linkedTracks.length > 0}
			<ul class="tracks">
				{#each linkedTracks as t (t.trackId)}
					<li>
						<span class="tnum">{t.trackNumber}.</span>
						<span class="tname">{t.title}</span>
						<button
							type="button"
							class="unlink"
							title="Unlink track"
							aria-label={`Unlink ${t.title}`}
							onclick={() => onUnlinkTrack(album.id, t.trackId)}
						>
							<SvgIcon path={mdiLinkOff} size={14} />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<footer class="actions">
		<span class="gate-label">
			{album.visibility === 'subscribers_only' ? 'Subscribers-only' : 'Public'}
		</span>
		<div class="spacer"></div>
		<button type="button" class="icon-btn" title="Edit album" onclick={() => onEdit(album)}>
			<SvgIcon path={mdiPencil} size={18} />
		</button>
		<button
			type="button"
			class="icon-btn danger"
			title="Delete album"
			onclick={() => onDelete(album)}
		>
			<SvgIcon path={mdiDelete} size={18} />
		</button>
	</footer>
</article>

<style lang="scss">
	.album-card {
		display: flex;
		flex-direction: column;
		background: var(--bg-surface);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition:
			transform var(--duration-normal),
			box-shadow var(--duration-normal),
			border-color var(--duration-fast);

		&:hover {
			transform: translateY(-4px);
			box-shadow: var(--shadow-lg);
		}
		&:focus-within {
			border-color: var(--border-focus);
			box-shadow: var(--shadow-lg);
		}
	}

	.cover {
		position: relative;
		aspect-ratio: 1;
		background: var(--bg-tertiary);

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}
		.cover-placeholder {
			width: 100%;
			height: 100%;
			display: flex;
			align-items: center;
			justify-content: center;
			color: var(--text-tertiary);
		}
		.badge-tl {
			position: absolute;
			top: var(--space-2);
			left: var(--space-2);
		}
		.badge-tr {
			position: absolute;
			top: var(--space-2);
			right: var(--space-2);
		}
	}

	.body {
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		flex: 1;

		.title {
			margin: 0;
			font-size: var(--font-size-lg);
			font-weight: var(--font-weight-semibold);
			color: var(--text-primary);
		}
		.desc {
			margin: 0;
			font-size: var(--font-size-sm);
			color: var(--text-secondary);
			display: -webkit-box;
			-webkit-line-clamp: 2;
			line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}
		.meta {
			display: flex;
			gap: var(--space-3);
			flex-wrap: wrap;
			font-size: var(--font-size-xs);
			color: var(--text-tertiary);
			font-variant-numeric: tabular-nums;
			.count {
				color: var(--text-secondary);
			}
		}
	}

	.tracks {
		list-style: none;
		margin: var(--space-1) 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;

		li {
			display: flex;
			align-items: center;
			gap: var(--space-2);
			font-size: var(--font-size-xs);
			color: var(--text-secondary);
			padding: 2px 0;
		}
		.tnum {
			color: var(--text-tertiary);
			font-variant-numeric: tabular-nums;
		}
		.tname {
			flex: 1;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.unlink {
			border: 0;
			background: transparent;
			color: var(--text-tertiary);
			cursor: pointer;
			display: inline-flex;
			padding: 2px;
			border-radius: var(--radius-sm);
			&:hover {
				color: var(--color-error-500);
			}
			&:focus-visible {
				outline: 2px solid var(--border-focus);
			}
		}
	}

	.actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--border-primary);
		background: var(--bg-secondary);

		.spacer {
			flex: 1;
		}
		.gate-label {
			font-size: var(--font-size-xs);
			color: var(--text-tertiary);
		}
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition:
			background var(--duration-fast),
			color var(--duration-fast),
			border-color var(--duration-fast);

		&:hover {
			background: var(--bg-tertiary);
			color: var(--text-primary);
		}
		&:focus-visible {
			outline: 2px solid var(--border-focus);
			outline-offset: 1px;
		}
		&.danger:hover {
			color: var(--color-error-500);
			border-color: var(--color-error-500);
		}
	}
</style>
