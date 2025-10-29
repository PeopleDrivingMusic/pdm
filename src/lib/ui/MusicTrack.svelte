<script lang="ts">
	import { albums, artists, type tracks } from '$lib/db/schema';
	import type { InferSelectModel } from 'drizzle-orm';
	import Avatar from './Avatar.svelte';
	import SvgIcon from './SvgIcon.svelte';
	import { mdiPlay } from '@mdi/js';

	const {
		track,
		album,
		artist
	}: {
		track: InferSelectModel<typeof tracks>;
		album?: InferSelectModel<typeof albums> | null;
		artist?: InferSelectModel<typeof artists> | null;
	} = $props();

	// your script goes here
</script>

<button class="music-track" >
	<div class="image-wrapper">
		<Avatar
			size="lg"
			src={track.imageUrl || album?.coverImageUrl || artist?.avatar}
			square={true}
		/>
		<div class="bg"></div>
		<div class="play-icon">
			<SvgIcon path={mdiPlay} size={48} />
		</div>
	</div>
	<div class="track-info">
		<h3 class="track-title">{track.title}</h3>
		<a class="track-artist" href="/artist/{artist?.slug}" onmouseenter={(e) => e.stopPropagation()}>{artist?.name}</a>
	</div>
</button>

<style lang="scss">
	.music-track {
		display: flex;
		align-items: start;
		gap: 1rem;
		.image-wrapper {
			flex-shrink: 0;
			position: relative;
			height: 72px;
			.bg {
				flex-shrink: 0;
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background: var(--bg-primary);
				opacity: 0;
				display: flex;
				align-items: center;
				justify-content: center;
                transition: all 0.3s ease;
				z-index: 1;
			}
			.play-icon {
                position: absolute;
                transition: all 0.3s ease;
                opacity: 0;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 2;
				color: var(--color-brand-400);
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
			}
		}
        
		.track-info {
            height: 100%;
            justify-content: center;
			display: flex;
			flex-direction: column;
            align-items: start;
			gap: 6px;
			.track-title {
				@include text-lg();
				color: var(--text-primary);
			}
			.track-artist {
				@include text-md();
				color: var(--text-tertiary);

                &:hover {
                    text-decoration: underline;
                    color: var(--text-primary) !important;
                }
			}
		}

        &:hover {
            .bg {
                background: var(--bg-primary);
                opacity: 0.7;
            }
            .play-icon {
                opacity: 1;
            }

            .track-info {
                .track-title {
                    color: var(--color-brand-400);
                }
                .track-artist {
                    color: var(--text-secondary);
                }
            }
        }
	}
</style>
