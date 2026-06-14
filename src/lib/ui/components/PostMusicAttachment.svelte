<script lang="ts">
	import { mdiAlbum, mdiMusicNote, mdiPause, mdiPlay } from '@mdi/js';
	import type { Album, Artist, Track } from '$lib/db';
	import { playerStore } from '$lib/stores/player.svelte';
	import SvgIcon from '../SvgIcon.svelte';

	type Attachment = {
		id: string;
		type: 'track' | 'album';
		title: string;
		imageUrl: string | null;
	};

	type TrackEntry = {
		track: Track;
		isLiked?: boolean;
	};

	const {
		attachment,
		trackEntry,
		album,
		artist
	}: {
		attachment: Attachment;
		trackEntry?: TrackEntry;
		album?: Album | null;
		artist?: Artist | null;
	} = $props();

	const isTrack = $derived(attachment.type === 'track');
	const canPlay = $derived(Boolean(isTrack && trackEntry?.track.audioUrl));
	const isCurrent = $derived(playerStore.currentTrack?.track.id === attachment.id);
	const isPlaying = $derived(isCurrent && playerStore.isPlaying);

	function playTrack() {
		if (!trackEntry?.track.audioUrl) return;

		const track = trackEntry.track;
		const isInQueue = playerStore.que.findIndex((queueItem) => queueItem.track.id === track.id);

		if (isInQueue >= 0) {
			if (isInQueue === playerStore.currentTrackIndex) {
				playerStore.isPlaying = !playerStore.isPlaying;
				return;
			}

			playerStore.currentTime = 0;
			playerStore.currentTrackIndex = isInQueue;
			playerStore.isPlaying = true;
			return;
		}

		const insertIndex = Math.max(playerStore.currentTrackIndex, -1) + 1;
		playerStore.que.splice(insertIndex, 0, {
			track,
			artist,
			album,
			isLiked: trackEntry.isLiked
		});
		playerStore.currentTime = 0;
		playerStore.currentTrackIndex = insertIndex;
		playerStore.isPlaying = true;
	}
</script>

<button
	type="button"
	class="post-music-attachment"
	class:is-playing={isPlaying}
	class:is-disabled={!canPlay}
	onclick={playTrack}
	disabled={!canPlay}
	aria-label={canPlay ? `${isPlaying ? 'Pause' : 'Play'} ${attachment.title}` : `${attachment.title} is not playable yet`}
>
	<div class="cover">
		{#if attachment.imageUrl}
			<img src={attachment.imageUrl} alt="" loading="lazy" />
		{:else}
			<SvgIcon path={isTrack ? mdiMusicNote : mdiAlbum} size={22} />
		{/if}
		<div class="play-layer">
			<SvgIcon path={isPlaying ? mdiPause : mdiPlay} size={24} />
		</div>
	</div>

	<div class="copy">
		<span>{isTrack ? 'Track' : 'Album'}</span>
		<strong>{attachment.title}</strong>
		{#if isTrack}
			<small>{canPlay ? 'Play in PDM' : 'Audio unavailable'}</small>
		{:else}
			<small>Release attachment</small>
		{/if}
	</div>

	<div class="pulse" aria-hidden="true">
		<span></span>
		<span></span>
		<span></span>
	</div>
</button>

<style lang="scss">
	.post-music-attachment {
		position: relative;
		width: min(100%, 360px);
		min-height: 76px;
		display: grid;
		grid-template-columns: 56px minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3) var(--space-2) var(--space-2);
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--primary) 24%, var(--border-primary));
		border-radius: var(--radius-md);
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--primary) 16%, transparent), transparent 46%),
			color-mix(in srgb, var(--bg-surface) 82%, var(--bg-primary));
		color: var(--text-primary);
		text-align: left;
		cursor: pointer;
		transition:
			transform var(--duration-fast) var(--easing-ease-out),
			border-color var(--duration-fast) var(--easing-ease-out),
			background var(--duration-fast) var(--easing-ease-out);

		&:hover:not(:disabled) {
			transform: translateY(-1px);
			border-color: color-mix(in srgb, var(--primary) 62%, var(--border-primary));
			background:
				linear-gradient(135deg, color-mix(in srgb, var(--primary) 22%, transparent), transparent 52%),
				color-mix(in srgb, var(--bg-surface) 92%, var(--bg-primary));
		}

		&:focus-visible {
			outline: 2px solid var(--border-focus);
			outline-offset: 3px;
		}

		&:disabled {
			cursor: not-allowed;
		}

		&.is-disabled {
			opacity: 0.68;
		}

		&.is-playing {
			border-color: color-mix(in srgb, var(--primary) 78%, var(--border-primary));
			box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary) 18%, transparent);
		}
	}

	.cover {
		position: relative;
		width: 56px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--primary) 14%, var(--bg-tertiary));
		color: var(--primary);

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.play-layer {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.46);
		color: var(--text-primary);
		opacity: 0;
		transition: opacity var(--duration-fast) var(--easing-ease-out);
	}

	.post-music-attachment:hover:not(:disabled) .play-layer,
	.post-music-attachment.is-playing .play-layer {
		opacity: 1;
	}

	.copy {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;

		span,
		small {
			color: var(--text-tertiary);
			font-size: var(--font-size-xs);
		}

		strong {
			overflow: hidden;
			color: var(--text-primary);
			font-size: var(--font-size-md);
			line-height: 1.2;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	.pulse {
		display: flex;
		align-items: end;
		gap: 3px;
		height: 20px;
		color: var(--primary);
		opacity: 0;

		span {
			width: 3px;
			height: 8px;
			border-radius: 999px;
			background: currentColor;
			animation: pulse-bar 0.86s ease-in-out infinite;

			&:nth-child(2) {
				height: 14px;
				animation-delay: 0.12s;
			}

			&:nth-child(3) {
				height: 10px;
				animation-delay: 0.24s;
			}
		}
	}

	.is-playing .pulse {
		opacity: 1;
	}

	@keyframes pulse-bar {
		0%,
		100% {
			transform: scaleY(0.55);
		}

		50% {
			transform: scaleY(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.post-music-attachment,
		.play-layer {
			transition: none;
		}

		.pulse span {
			animation: none;
		}
	}
</style>
