<script lang="ts">
	import { playerStore } from '$lib/stores/player.svelte';
	import Progress from '$lib/ui/Progress.svelte';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import {
		mdiSkipPrevious,
		mdiPause,
		mdiPlay,
		mdiSkipNext
	} from '@mdi/js';

	let isUserSeeking = $state(false);

	const { isPlaying, currentTime, currentTrack, que, currentTrackIndex, duration } = $derived(playerStore);

	function togglePlay() {
		playerStore.isPlaying = !isPlaying;
	}

	function handleProgressChange(progress: number) {
		isUserSeeking = true;
		if (!duration) {
			isUserSeeking = false;
			return;
		}
		const newTime = (progress / 100) * duration;
		playerStore.currentTime = newTime;
		isUserSeeking = false;
	}

	function skipPrevious() {
		if (currentTrackIndex > 0) {
			playerStore.currentTime = 0;
			playerStore.currentTrackIndex -= 1;
		}
	}

	function skipNext() {
		if (currentTrackIndex < que.length - 1) {
			playerStore.currentTime = 0;
			playerStore.currentTrackIndex += 1;
		}
	}

	function formatTime(seconds: number) {
		if (!seconds || isNaN(seconds)) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
</script>
<div class="main-wrapper">
	<div class="progress-bar">
		<Progress
			progress={(currentTime / (duration || 1)) * 100}
			height={5}
			onchange={handleProgressChange}
			changeable={true}
		/>
	</div>
	<div class="music-controls">
		<button class="control-button" onclick={skipPrevious}>
			<SvgIcon path={mdiSkipPrevious} size={24} />
		</button>
		<button class="control-button" onclick={togglePlay}>
			{#if isPlaying}
				<SvgIcon path={mdiPause} size={32} />
			{:else}
				<SvgIcon path={mdiPlay} size={32} />
			{/if}
		</button>
		<button class="control-button" onclick={skipNext}>
			<SvgIcon path={mdiSkipNext} size={24} />
		</button>
	</div>
	<!-- <div class="volume-control">
		<button class="volume-button" onclick={toggleMute}>
			<SvgIcon path={isMuted ? mdiVolumeMute : mdiVolumeHigh} size={20} />
		</button>
		<input
			type="range"
			min="0"
			max="100"
			value={volume}
			onchange={handleVolumeChange}
			class="volume-slider"
		/>
		<span class="volume-text">{volume}%</span>
	</div> -->
</div>

<style lang="scss">
	.main-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		.progress-bar {
			width: 300px;
		}
		.music-controls {
			display: flex;
			align-items: center;
			gap: var(--space-2);

			.control-button {
				background: none;
				border: none;
				cursor: pointer;
				color: var(--text-primary);

				&:hover {
					color: var(--primary);
				}
			}
		}
	}
</style>
