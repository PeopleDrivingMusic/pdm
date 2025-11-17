<script lang="ts">
	import { Button } from '$lib/ui';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import { mdiPlay, mdiHeart } from '@mdi/js';

	interface Recommendation {
		id: string;
		trackName: string;
		artistName: string;
		image: string;
		reason: string;
	}

	interface Props {
		recommendation: Recommendation;
	}

	let { recommendation }: Props = $props();
	let liked = $state(false);

	function toggleLike() {
		liked = !liked;
	}
</script>

<div class="recommendation-card">
	<div class="rec-image" style={`background-image: url('${recommendation.image}')`}>
		<button class="play-btn" aria-label="Play track">
			<SvgIcon path={mdiPlay} size={24} />
		</button>
		<button class="like-btn" class:active={liked} on:click={toggleLike} aria-label="Like track">
			<SvgIcon path={mdiHeart} size={20} />
		</button>
	</div>

	<div class="rec-content">
		<h3 class="rec-track">{recommendation.trackName}</h3>
		<p class="rec-artist">{recommendation.artistName}</p>
		<p class="rec-reason">{recommendation.reason}</p>
	</div>
</div>

<style lang="scss">

	.recommendation-card {
		display: flex;
		flex-direction: column;
		background: var(--bg-secondary);
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: all 0.3s ease;

		@media (prefers-color-scheme: dark) {
			border-color: var(--color-gray-800);
		}

		&:hover {
			transform: translateY(-4px);
			border-color: var(--primary);
			box-shadow: 0 8px 16px rgba(59, 130, 246, 0.15);

			@media (prefers-color-scheme: dark) {
				box-shadow: 0 8px 16px rgba(99, 102, 241, 0.25);
			}

			.rec-image {
				&::before {
					opacity: 1;
				}
			}
		}
	}

	.rec-image {
		position: relative;
		width: 100%;
		height: 160px;
		background-size: cover;
		background-position: center;
		background-color: var(--color-gray-300);

		&::before {
			content: '';
			position: absolute;
			inset: 0;
			background: rgba(0, 0, 0, 0.4);
			opacity: 0;
			transition: opacity 0.3s ease;
		}
	}

	.play-btn {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: var(--radius-full);
		border: none;
		background: var(--primary);
		color: white;
		cursor: pointer;
		transition: all 0.2s ease;
		z-index: 2;
		opacity: 0;
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);

		.recommendation-card:hover & {
			opacity: 1;
		}

		&:hover {
			transform: translate(-50%, -50%) scale(1.1);
			box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
		}
	}

	.like-btn {
		position: absolute;
		top: var(--space-2);
		right: var(--space-2);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-full);
		border: none;
		background: rgba(255, 255, 255, 0.9);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.2s ease;
		z-index: 2;
		backdrop-filter: blur(8px);

		&:hover {
			background: white;
			color: #ec4899;
		}

		&.active {
			background: white;
			color: #ec4899;
		}
	}

	.rec-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		flex: 1;
	}

	.rec-track {
		@include text-sm();
		@include font-semibold();
		margin: 0;
		color: var(--text-primary);
	}

	.rec-artist {
		@include text-xs();
		margin: 0;
		color: var(--text-secondary);
	}

	.rec-reason {
		@include text-xs();
		margin: 0;
		color: var(--primary);
		font-style: italic;
	}
</style>
