<script lang="ts">
	import { playerStore } from '$lib/stores/player.svelte';

	let audio: HTMLAudioElement;
	let isSyncingTime = $state(false);
	let lastTrackId: string | null = $state(null);

	const { isPlaying, currentTrack, que, currentTrackIndex, volume } = $derived(playerStore);

	$effect(() => {
		if (!audio) return;
		audio.volume = volume ?? 1;
	});

	$effect(() => {
		if (!audio) return;
		const trackId = currentTrack?.track?.id ?? null;

		if (!trackId) {
			audio.pause();
			audio.removeAttribute('src');
			audio.load();
			lastTrackId = null;
			return;
		}

		if (trackId !== lastTrackId) {
			lastTrackId = trackId;
			fetch(`/api/music/${trackId}`)
				.then((res) => {
					if (!res.ok) throw new Error('Failed to get stream URL');
					return res.json();
				})
				.then((data) => {
					if (!data.src || typeof data.src !== 'string') {
						throw new Error('Stream URL response is invalid');
					}
					audio.src = data.src;
					audio.currentTime = playerStore.currentTime || 0;
					audio.load();
				})
				.catch((err) => {
					console.error('Error loading track URL:', err);
					audio.removeAttribute('src');
					audio.load();
				});
		}
	});

	$effect(() => {
		if (!audio) return;
		if (!currentTrack?.track?.audioUrl) return;
		if (!audio.src) return;

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
		if (!audio.src) return;
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

	function playWhenReady() {
		if (!isPlaying) return;
		audio.play().catch((err) => console.error('Play error inside event:', err));
	}

	function handleLoadedMetadata() {
		playerStore.duration = Number.isNaN(audio.duration) ? 0 : audio.duration;
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
	oncanplay={playWhenReady}
	ontimeupdate={handleTimeUpdate}
	onloadedmetadata={handleLoadedMetadata}
	onended={handleEnded}
	crossorigin="anonymous"
></audio>
