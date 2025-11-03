<script lang="ts">
	import { playerStore } from '$lib/stores/player.svelte';
	import Progress from '$lib/ui/Progress.svelte';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import {
		mdiSkipPrevious,
		mdiPause,
		mdiPlay,
		mdiSkipNext,
		mdiVolumeHigh,
		mdiVolumeMute
	} from '@mdi/js';
	import { untrack } from 'svelte';
	let audio: HTMLAudioElement;
	let isMuted = $state(false);
	let volume = $state(100);
	let duration = $state(0);
	let isUserSeeking = $state(false);

	const { isPlaying, currentTime, currentTrack, que, currentTrackIndex } = $derived(playerStore);

	function togglePlay() {
		if (isPlaying) {
			pause();
		} else {
			play();
		}
	}

	$effect(() => {
		if (currentTrack) untrack(() => play());
	});

	function play() {
		audio.src = currentTrack?.track.audioUrl || '';
		audio.currentTime = currentTime;
		audio.play().catch((err) => console.error('Play error:', err));
		playerStore.isPlaying = true;
	}

	function pause() {
		playerStore.currentTime = audio.currentTime;
		audio.pause();
		playerStore.isPlaying = false;
	}

	function handleTimeUpdate() {
		if (!isUserSeeking) {
			playerStore.currentTime = audio.currentTime;
		}
	}

	function handleLoadedMetadata() {
		duration = audio.duration;
	}

	function handleEnded() {
		skipNext();
	}

	function handleProgressChange(progress: number) {
		isUserSeeking = true;
		const newTime = (progress / 100) * duration;
		playerStore.currentTime = newTime;
		audio.currentTime = newTime;
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

	function toggleMute() {
		isMuted = !isMuted;
		audio.muted = isMuted;
	}

	function handleVolumeChange(e: Event) {
		const target = e.target as HTMLInputElement;
		volume = parseInt(target.value);
		audio.volume = volume / 100;
	}

	function formatTime(seconds: number) {
		if (!seconds || isNaN(seconds)) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<audio
	bind:this={audio}
	ontimeupdate={handleTimeUpdate}
	onloadedmetadata={handleLoadedMetadata}
	onended={handleEnded}
	crossorigin="anonymous"
>
</audio>
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
