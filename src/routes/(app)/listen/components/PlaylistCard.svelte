<script lang="ts">
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import { mdiPlay, mdiHeart, mdiHeartOutline } from '@mdi/js';

	interface Props {
		playlist: {
			id: string;
			title: string;
			description: string;
			cover: string;
			trackCount: number;
			followers: number;
		};
	}

	const { playlist }: Props = $props();

	let isFavorite = $state(false);

	function toggleFavorite(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		isFavorite = !isFavorite;
	}
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- `/playlist/[id]` isn't a real route yet (this card is a listen-page prototype with no detail page behind it); resolve() would fail svelte-check against a route that doesn't exist. -->
<a href={`/playlist/${playlist.id}`} class="playlist-card">
	<div class="playlist-card__cover">
		<img src={playlist.cover} alt={playlist.title} />
		<div class="playlist-card__overlay">
			<button class="playlist-card__play" onclick={() => console.log('Play playlist')}>
				<SvgIcon path={mdiPlay} size={24} />
			</button>
			<button
				class="playlist-card__favorite"
				class:is-favorite={isFavorite}
				aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
				aria-pressed={isFavorite}
				onclick={toggleFavorite}
			>
				<SvgIcon path={isFavorite ? mdiHeart : mdiHeartOutline} size={18} />
			</button>
		</div>
	</div>

	<div class="playlist-card__content">
		<h3 class="playlist-card__title">{playlist.title}</h3>
		<p class="playlist-card__description">{playlist.description}</p>
		<div class="playlist-card__meta">
			<span>{playlist.trackCount} tracks</span>
			<span>•</span>
			<span>{(playlist.followers / 1000).toFixed(1)}K followers</span>
		</div>
	</div>
</a>

<style lang="scss">
	.playlist-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		background-color: var(--bg-primary);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-primary);
		padding: var(--space-3);
		text-decoration: none;
		color: inherit;
		transition: all var(--duration-normal) var(--easing-ease-out);

		&:hover {
			transform: translateY(-4px);
			border-color: var(--color-brand-500);
			box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);

			@media (prefers-color-scheme: dark) {
				box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
			}
		}
	}

	.playlist-card__cover {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		border-radius: var(--radius-md);
		overflow: hidden;
		background-color: var(--color-gray-200);

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.playlist-card__overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--duration-normal) var(--easing-ease-out);

		.playlist-card:hover & {
			background: rgba(0, 0, 0, 0.4);
		}
	}

	.playlist-card__play {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background-color: var(--color-brand-500);
		color: var(--color-white);
		border: none;
		cursor: pointer;
		transition: all var(--duration-normal) var(--easing-ease-out);
		transform: scale(0.8);
		opacity: 0;

		.playlist-card:hover & {
			transform: scale(1);
			opacity: 1;
		}

		&:hover {
			background-color: var(--color-brand-600);
			transform: scale(1.1);
		}
	}

	.playlist-card__favorite {
		position: absolute;
		top: var(--space-2);
		right: var(--space-2);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: none;
		background: rgba(0, 0, 0, 0.45);
		color: var(--color-white);
		cursor: pointer;
		opacity: 0;
		transition: all var(--duration-normal) var(--easing-ease-out);

		.playlist-card:hover & {
			opacity: 1;
		}

		&.is-favorite {
			opacity: 1;
			color: var(--color-brand-500);
		}

		&:hover {
			background: rgba(0, 0, 0, 0.65);
		}
	}

	.playlist-card__content {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-height: 70px;
	}

	.playlist-card__title {
		margin: 0;
		@include text-md();
		font-weight: 600;
		color: var(--color-gray-900);
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;

		@media (prefers-color-scheme: dark) {
			color: var(--color-white);
		}
	}

	.playlist-card__description {
		margin: 0;
		@include text-xs();
		color: var(--color-gray-600);
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;

		@media (prefers-color-scheme: dark) {
			color: var(--color-gray-400);
		}
	}

	.playlist-card__meta {
		display: flex;
		gap: var(--space-2);
		@include text-xs();
		color: var(--color-gray-500);

		@media (prefers-color-scheme: dark) {
			color: var(--color-gray-500);
		}
	}
</style>
