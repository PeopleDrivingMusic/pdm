<script lang="ts">
	import type { Album, Artist, Track } from '$lib/db';
	import { Button } from '$lib/ui';
	import Player from './Player.svelte';

	interface CoverPreviewProps {
		track: Track;
		artist?: Artist;
		album?: Album;
	}

	const { track, artist, album }: CoverPreviewProps = $props();
</script>

<div class="preview">
	<div
		class="track-bg"
		style="background-image: url('{track.imageUrl || album?.coverImageUrl || artist?.avatar}')"
	></div>
	<div class="info-box">
		<div class="artist-wrapper">
			<a class="track-artist" href="/artist/{artist?.slug}">{artist?.name}</a>

			<div class="buttons-wrapper">
				<Button variant="secondary" size="md">Follow</Button>
				<Button variant="primary" size="md">Subscribe</Button>
			</div>
		</div>
        <div class="album-info">
            <h3 class="album-name">{album?.title}</h3>
            <span class="album-year">{album?.releaseDate?.getFullYear()}</span>
        </div>
		<div class="track-info">
			<div class="artist-info">
				<div class="track-title">{track.title}</div>
			</div>
		</div>
        <div class="playerWrapper">
            <Player></Player>
        </div>
	</div>
</div>

<style lang="scss">
	.preview {
		width: 100%;
		height: 70%;
		display: flex;
		justify-content: center;
		gap: var(--space-5);

		.track-bg {
			background-position: center;
			background-size: cover;
			overflow: hidden;
			background-repeat: no-repeat;
			max-width: 50%;
			flex-shrink: 0;
			aspect-ratio: 1/1;
			border-radius: var(--radius-xl);
		}

		.info-box {
			flex-grow: 1;
			max-width: 50%;
			padding: var(--space-6);
			border-radius: var(--radius-xl);
			background-color: var(--bg-secondary);
			box-shadow: var(--shadow-lg);
            display: flex;
            flex-direction: column;
			.track-info {
				display: flex;
				cursor: pointer;
				padding: 0;
				flex-direction: column;
				align-items: flex-start;
				gap: 0;
				flex-grow: 1;
				.track-title {
					color: var(--text-secondary);
					@include text-lg();
				}
			}
			.artist-wrapper {
				display: flex;
				justify-content: space-between;
				align-items: center;
                gap: var(--space-3);
				.track-artist {
                    overflow: hidden;
                    text-overflow: ellipsis;
					color: var(--text-primary);
					@include text-display-md();

					&:hover {
						color: var(--primary);
						text-decoration: underline;
					}
				}
				.buttons-wrapper {
					display: flex;
					gap: var(--space-3);
				}
			}

			.album-info {
				display: flex;
				gap: var(--space-2);
				align-items: center;
				.album-name {
					color: var(--text-secondary);
				}
                .album-year {
                    color: var(--text-tertiary);
                }
			}

            .playerWrapper {
                justify-self: flex-end;
                // flex-grow: 1;
                // display: flex;
                // width: 100%;
                // justify-content: flex-end;
                // align-items: center;
            }
		}
	}
</style>
