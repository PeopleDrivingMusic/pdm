<script lang="ts">
	import { albums, artists } from '$lib/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';

	const {
		album,
		artist
	}: {
		album: InferSelectModel<typeof albums> | null;
		artist?: InferSelectModel<typeof artists> | null;
	} = $props();

	// your script goes here
</script>

<button class="music-album">
	<div class="image-wrapper">
		<div class="album-cover" style="background-image: url('{album?.coverImageUrl}');"></div>
	</div>
	<div class="album-info">
		<h3 class="album-title">{album?.title}</h3>
		<div class="date">{album?.releaseDate?.getFullYear()}</div>
	</div>
</button>

<style lang="scss">
	.music-album {
		display: flex;
		flex-direction: column;
		align-items: start;
		gap: var(--space-2);
		max-width: 200px;
		.image-wrapper {
			flex-shrink: 0;
			position: relative;
			width: 200px;
			aspect-ratio: 1/1;

			.album-cover {
				border-radius: var(--radius-md);
				width: 100%;
				height: 100%;
				background-size: cover;
				background-position: center;
			}
		}

		.album-info {
			height: 100%;
			justify-content: center;
			display: flex;
			align-items: start;
			flex-direction: column;
			gap: var(--space-1);
			.album-title {
				@include text-xl();
				color: var(--text-primary);
				text-align: left;
			}
			.date {
				@include text-sm();
				color: var(--text-secondary);
			}
		}
	}
</style>
