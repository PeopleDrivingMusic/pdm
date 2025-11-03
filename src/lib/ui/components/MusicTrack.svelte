<script lang="ts">
	import { playerStore } from '$lib/stores/player.svelte';
	import Avatar from '../Avatar.svelte';
	import SvgIcon from '../SvgIcon.svelte';
	import { mdiPlay } from '@mdi/js';
	import type { Album, Artist, Track } from '$lib/db';

	const {
		track,
		album,
		artist
	}: {
		track: Track;
		album?: Album;
		artist?: Artist;
	} = $props();

	function trackClick() {
		const isInQue = playerStore.que.findIndex(queItem => queItem.track.id === track.id);
		if (isInQue >= 0) {
			const currentIndex = playerStore.currentTrackIndex;
			const desiredIndex = currentIndex + 1;

			// if clicked the currently playing track — restart it
			if (isInQue === currentIndex) {
				playerStore.currentTime = 0;
				playerStore.isPlaying = true;
				return;
			}

			// if it's already immediately after current — just play it next
			if (isInQue === desiredIndex) {
				playerStore.currentTime = 0;
				playerStore.currentTrackIndex = desiredIndex;
				playerStore.isPlaying = true;
				return;
			}

			// remove the item from its old position
			const [item] = playerStore.que.splice(isInQue, 1);

			// adjust current index if the removed item was before the current track
			const adjustedCurrentIndex = isInQue < currentIndex ? currentIndex - 1 : currentIndex;

			// insert it right after the current track and start playing it
			playerStore.que.splice(adjustedCurrentIndex + 1, 0, item);
			playerStore.currentTime = 0;
			playerStore.currentTrackIndex = adjustedCurrentIndex + 1;
			playerStore.isPlaying = true;
			return;
		}
		const currentIndex = playerStore.currentTrackIndex;
		playerStore.currentTime = 0;
		playerStore.que.splice(currentIndex + 1, 0, { track, artist, album });
		playerStore.currentTrackIndex += 1;
		playerStore.isPlaying = true;
	}

</script>

<button class="music-track" onclick={trackClick}>
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
		<a class="track-artist" href="/artist/{artist?.slug}" onmouseenter={(e) => e.stopPropagation()}
			>{artist?.name}</a
		>
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
