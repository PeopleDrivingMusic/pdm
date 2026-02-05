<script lang="ts">
	import { playerStore } from '$lib/stores/player.svelte';

	let audio: HTMLAudioElement;
	let isSyncingTime = $state(false);
	let lastTrackId: string | null = $state(null);

	const { isPlaying, currentTime, currentTrack, que, currentTrackIndex, volume } = $derived(playerStore);

	$effect(() => {
		if (!audio) return;
		audio.volume = volume ?? 1;
	});

	$effect(() => {
		if (!audio) return;
		const trackId = currentTrack?.track?.id ?? null;
		const trackUrl = currentTrack?.track?.audioUrl ?? '';

		if (!trackUrl) {
			audio.pause();
			audio.removeAttribute('src');
			audio.load();
			lastTrackId = null;
			return;
		}

		if (trackId !== lastTrackId) {
			lastTrackId = trackId;
			audio.src = trackUrl;
			audio.currentTime = playerStore.currentTime || 0;
			if (playerStore.isPlaying) {
				audio.play().catch((err) => console.error('Play error:', err));
			}
		}
	});

	$effect(() => {
		if (!audio) return;
		if (!currentTrack?.track?.audioUrl) return;
		if (isPlaying) {
			if (audio.paused) {
				audio.play().catch((err) => console.error('Play error:', err));
			}
		} else if (!audio.paused) {
			audio.pause();
		}
	});

	$effect(() => {
		if (!audio) return;
		if (!currentTrack?.track?.audioUrl) return;
		if (isSyncingTime) return;
		const desired = playerStore.currentTime || 0;
		if (Math.abs(audio.currentTime - desired) > 0.25) {
			audio.currentTime = desired;
		}
	});

	function handleTimeUpdate() {
		isSyncingTime = true;
		playerStore.currentTime = audio.currentTime;
		queueMicrotask(() => {
			isSyncingTime = false;
		});
	}

	function handleLoadedMetadata() {
		playerStore.duration = isNaN(audio.duration) ? 0 : audio.duration;
	}

	function handleEnded() {
		skipNext();
	}

	function skipNext() {
		if (currentTrackIndex < que.length - 1) {
			playerStore.currentTime = 0;
			playerStore.currentTrackIndex += 1;
		} else {
			playerStore.isPlaying = false;
		}
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
