<script lang="ts">
	import { mdiLock, mdiPencil, mdiDelete } from '@mdi/js';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import { resolveR2ImageUrl } from '$lib/utils/helpers';
	import { coverGradient } from './coverGradient';
	import type { AlbumDTO } from '$lib/server/music';

	let {
		album,
		featured = false,
		index = 1,
		trackCount = 0,
		onEdit,
		onDelete
	}: {
		album: AlbumDTO;
		featured?: boolean;
		index?: number;
		trackCount?: number;
		onEdit: (a: AlbumDTO) => void;
		onDelete: (a: AlbumDTO) => void;
	} = $props();

	const cover = $derived(resolveR2ImageUrl(album.coverImageKey));
	const releaseYear = $derived(
		album.releaseDate ? new Date(album.releaseDate).getFullYear() : null
	);
	const sub = $derived(
		`${trackCount} track${trackCount === 1 ? '' : 's'}` +
			(album.isPublished ? (releaseYear ? ` · ${releaseYear}` : '') : ' · Draft')
	);
</script>

<article class="tile" class:featured>
	<button
		type="button"
		class="hit"
		aria-label={`Edit ${album.title}`}
		onclick={() => onEdit(album)}
	>
		{#if cover}
			<img class="art" src={cover} alt="" loading="lazy" />
		{:else}
			<span class="art" style="background:{coverGradient(album.id)}"></span>
		{/if}
		<span class="scrim"></span>

		{#if featured}<span class="idx">{String(index).padStart(2, '0')} / Latest</span>{/if}

		{#if album.visibility === 'subscribers_only'}
			<span class="gate"><SvgIcon path={mdiLock} size={12} /> Subscribers</span>
		{/if}

		<span class="cap">
			<span class="name">{album.title}</span>
			<span class="meta">{sub}</span>
		</span>
	</button>

	<div class="hover-actions">
		<button type="button" title="Edit album" aria-label="Edit album" onclick={() => onEdit(album)}>
			<SvgIcon path={mdiPencil} size={16} />
		</button>
		<button
			type="button"
			class="danger"
			title="Delete album"
			aria-label="Delete album"
			onclick={() => onDelete(album)}
		>
			<SvgIcon path={mdiDelete} size={16} />
		</button>
	</div>
</article>

<style lang="scss">
	.tile {
		position: relative;
		border-radius: 18px;
		overflow: hidden;
		border: 1px solid var(--border-primary);
		background: var(--bg-tertiary);
		transition:
			transform var(--duration-normal),
			box-shadow var(--duration-normal);

		&:hover {
			transform: translateY(-3px);
			box-shadow: var(--shadow-lg);
		}
		&:focus-within {
			outline: 2px solid var(--border-focus);
			outline-offset: 2px;
		}
	}
	.tile.featured {
		grid-column: span 2;
		grid-row: span 2;
	}

	.hit {
		display: block;
		width: 100%;
		height: 100%;
		border: 0;
		padding: 0;
		background: none;
		cursor: pointer;
		text-align: left;
		position: relative;
	}
	.art {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(0, 0, 0, 0.05) 30%, rgba(0, 0, 0, 0.82));
	}
	.idx {
		position: absolute;
		top: 20px;
		left: 22px;
		font-family: var(--font-serif);
		font-size: 15px;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.75);
	}
	.gate {
		position: absolute;
		top: 14px;
		right: 14px;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		background: var(--gate-tint-bg);
		color: var(--gate-tint-text);
		font-size: 11px;
		font-weight: 600;
		padding: 5px 9px;
		border-radius: 8px;
		backdrop-filter: blur(8px);
	}
	.cap {
		position: absolute;
		left: 20px;
		right: 20px;
		bottom: 18px;
		display: flex;
		flex-direction: column;
		gap: 3px;
		.name {
			font-weight: 700;
			letter-spacing: -0.01em;
			color: #fff;
			font-size: 16px;
		}
		.meta {
			font-size: 12px;
			color: rgba(255, 255, 255, 0.72);
		}
	}
	.tile.featured .cap .name {
		font-family: var(--font-serif);
		font-size: 34px;
		line-height: 1.05;
	}

	.hover-actions {
		position: absolute;
		top: 12px;
		right: 12px;
		display: flex;
		gap: 6px;
		opacity: 0;
		transition: opacity var(--duration-fast);

		button {
			width: 32px;
			height: 32px;
			border-radius: 8px;
			border: 0;
			background: rgba(0, 0, 0, 0.55);
			color: #fff;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			backdrop-filter: blur(6px);
			&:hover {
				background: rgba(0, 0, 0, 0.75);
			}
			&.danger:hover {
				color: var(--color-error-300);
			}
			&:focus-visible {
				outline: 2px solid var(--border-focus);
			}
		}
	}
	.tile:hover .hover-actions,
	.tile:focus-within .hover-actions {
		opacity: 1;
	}
	/* When the gate badge is shown, nudge hover actions left so they don't overlap. */
	.tile:has(.gate) .hover-actions {
		top: 46px;
	}
</style>
