<script lang="ts">
	import PhotoLightbox from './PhotoLightbox.svelte';

	interface PostMediaItem {
		id: string;
		fileUrl: string;
		thumbnailUrl: string | null;
		alt: string | null;
		caption: string | null;
	}

	let { media = [] }: { media?: PostMediaItem[] } = $props();

	const single = $derived(media.length === 1);

	let lightboxOpen = $state(false);
	let lightboxIndex = $state(0);

	function openAt(index: number) {
		lightboxIndex = index;
		lightboxOpen = true;
	}
</script>

{#if media.length}
	<!-- Masonry: photos keep their natural aspect ratio (no cropping) and pack into
	     as many ~220px columns as the post width allows. A lone photo shows full. -->
	<div class="post-media" class:post-media--single={single} data-count={media.length}>
		{#each media as item, index (item.id)}
			<button
				type="button"
				class="tile"
				aria-label={`View photo ${index + 1}`}
				onclick={() => openAt(index)}
			>
				<img
					src={item.thumbnailUrl || item.fileUrl}
					alt={item.alt || item.caption || ''}
					loading="lazy"
				/>
			</button>
		{/each}
	</div>

	<PhotoLightbox photos={media} bind:open={lightboxOpen} bind:index={lightboxIndex} />
{/if}

<style lang="scss">
	.post-media {
		// ~2 columns inside the capped post width; 1 column on phones.
		columns: 300px;
		column-gap: var(--space-1);
		margin: 0;
	}

	.tile {
		display: block;
		width: 100%;
		margin: 0 0 var(--space-1);
		padding: 0;
		border: 0;
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--bg-tertiary);
		cursor: pointer;
		break-inside: avoid;

		img {
			width: 100%;
			height: auto;
			display: block;
			transition: transform var(--duration-normal) var(--easing-ease-out);
		}

		&:hover img {
			transform: scale(1.02);
		}

		&:focus-visible {
			outline: 2px solid var(--border-focus);
			outline-offset: 2px;
		}
	}

	// A single photo is shown in full (no crop), height-capped and centered.
	.post-media--single {
		columns: auto;
	}

	.post-media--single .tile {
		width: fit-content;
		max-width: 100%;
		margin-inline: auto;
	}

	.post-media--single .tile img {
		width: auto;
		max-width: 100%;
		max-height: clamp(300px, 60vh, 560px);
		object-fit: contain;
	}

	@media (prefers-reduced-motion: reduce) {
		.tile img,
		.tile:hover img {
			transition: none;
			transform: none;
		}
	}
</style>
