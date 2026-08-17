<script lang="ts">
	import type { PageProps } from './$types';
	import MusicTrack from '$lib/ui/components/MusicTrack.svelte';
	import AlbumCard from './components/AlbumCard.svelte';
	import PlaylistCard from './components/PlaylistCard.svelte';
	import HeroSection from './components/HeroSection.svelte';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import {
		mdiHeartOutline,
		mdiClockOutline,
		mdiTrendingUp,
		mdiCompass,
		mdiAlbum,
		mdiPlaylistMusic
	} from '@mdi/js';
	import Aurora from '$lib/ui/backgrounds/Aurora.svelte';

	let { data }: PageProps = $props();

	// Mock data for albums
	const albums = [
		{
			id: '1',
			title: 'Neon Nights',
			artist: 'Luna Echo',
			cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300',
			year: 2024,
			trackCount: 12,
			duration: '48 min'
		},
		{
			id: '2',
			title: 'Cosmic Journey',
			artist: 'Cosmic Vibes',
			cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300',
			year: 2023,
			trackCount: 15,
			duration: '64 min'
		},
		{
			id: '3',
			title: 'Aurora Sky',
			artist: 'Aurora Sky',
			cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300',
			year: 2024,
			trackCount: 18,
			duration: '72 min'
		},
		{
			id: '4',
			title: 'Future Sounds',
			artist: 'Neon Dreams',
			cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300',
			year: 2024,
			trackCount: 11,
			duration: '44 min'
		}
	];

	// Mock data for playlists
	const playlists = [
		{
			id: '1',
			title: 'Chill Vibes',
			description: 'Relaxing tracks for your day',
			cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300',
			trackCount: 42,
			followers: 5200
		},
		{
			id: '2',
			title: 'Workout Energy',
			description: 'High energy music for the gym',
			cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300',
			trackCount: 38,
			followers: 3100
		},
		{
			id: '3',
			title: 'Late Night Study',
			description: 'Focus-friendly ambient sounds',
			cover: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300',
			trackCount: 56,
			followers: 8900
		},
		{
			id: '4',
			title: 'Party Mix',
			description: 'Dance all night long',
			cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300',
			trackCount: 67,
			followers: 12500
		}
	];

	const sections = [
		{
			id: 'favorites',
			title: 'Your Favorites',
			subtitle: 'Songs you love',
			icon: mdiHeartOutline,
			type: 'tracks'
		},
		{
			id: 'recently-played',
			title: 'Recently Played',
			subtitle: 'Continue listening',
			icon: mdiClockOutline,
			type: 'tracks'
		},
		{
			id: 'trending',
			title: 'Trending Now',
			subtitle: 'Most played this week',
			icon: mdiTrendingUp,
			type: 'tracks'
		},
		{
			id: 'albums',
			title: 'New Albums',
			subtitle: 'Latest releases',
			icon: mdiAlbum,
			type: 'albums'
		},
		{
			id: 'playlists',
			title: 'Featured Playlists',
			subtitle: 'Curated collections',
			icon: mdiPlaylistMusic,
			type: 'playlists'
		},
		{
			id: 'explore',
			title: 'Explore',
			subtitle: 'Discover something new',
			icon: mdiCompass,
			type: 'tracks'
		}
	];
</script>

<div class="listen-page">
	<div class="bg">
		<Aurora
			colorStops={['#7b94ff', '#45d69a', '#ffb200', '#1a1a1a']}
			blend={0.5}
			amplitude={0.7}
			speed={10}
		/>
	</div>
	<!-- Hero Section -->
	<HeroSection />

	<!-- Main Content -->
	<div class="listen-wrapper">
		{#each sections as section (section.id)}
			<section class="listen-section">
				<!-- Section Header -->
				<div class="section-header">
					<div class="section-header__content">
						<div class="section-header__icon">
							<SvgIcon path={section.icon} size={28} />
						</div>
						<div>
							<h2 class="section-title">{section.title}</h2>
							<p class="section-subtitle">{section.subtitle}</p>
						</div>
					</div>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- `/listen/[id]` isn't a real route yet; this "View All" link is part of this page's still-mock section data. -->
					<a href={`/listen/${section.id}`} class="section-header__link"> View All </a>
				</div>

				<!-- Section Background -->
				<div class="section-bg"></div>

				<!-- Section Content -->
				<div class="section-content">
					{#if section.type === 'tracks'}
						<div class="tracks-scroll">
							{#if data.tracks.length}
								{#each data.tracks.slice(0, 6) as track (track.tracks.id)}
									<div class="track-item">
										<MusicTrack
											isLiked={track.isLiked}
											track={track.tracks}
											album={track.albums}
											artist={track.artists}
										/>
									</div>
								{/each}
							{:else}
								<div class="empty-state">
									<MusicTrack
										isLiked={false}
										track={{
											duration: null,
											id: '1',
											createdAt: new Date(),
											updatedAt: new Date(),
											genre: null,
											status: 'uploaded',
											artistId: '1',
											title: 'Metallica',
											isPublished: null,
											visibility: 'public',
											contentId: null,
											metadata: null,
											albumId: null,
											audioUrl: '/music/01.mp3',
											lyrics: null,
											clipUrl: null,
											imageUrl: null,
											trackNumber: null
										}}
									/>
									<p>No tracks available</p>
								</div>
							{/if}
						</div>
					{:else if section.type === 'albums'}
						<div class="albums-grid">
							{#each albums as album (album.id)}
								<AlbumCard {album} />
							{/each}
						</div>
					{:else if section.type === 'playlists'}
						<div class="playlists-grid">
							{#each playlists as playlist (playlist.id)}
								<PlaylistCard {playlist} />
							{/each}
						</div>
					{/if}
				</div>
			</section>
		{/each}

		<!-- Discovery Section -->
		<section class="discovery-section">
			<div class="discovery-header">
				<h2 class="discovery-title">Discover New Music</h2>
				<p class="discovery-subtitle">Based on your listening history</p>
			</div>

			<div class="discovery-grid">
				{#each albums.slice(0, 4) as album (album.id)}
					<div class="discovery-card">
						<div class="discovery-card__cover">
							<img src={album.cover} alt={album.title} />
							<div class="discovery-card__overlay">
								<button class="discovery-card__play">
									<SvgIcon path={mdiCompass} size={24} />
								</button>
							</div>
						</div>
						<div class="discovery-card__content">
							<h3>{album.title}</h3>
							<p>{album.artist}</p>
							<span>{album.year}</span>
						</div>
					</div>
				{/each}
			</div>
		</section>
	</div>
</div>

<style lang="scss">
	.listen-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
		min-height: 100vh;
		position: relative;
		.bg {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 60vh;
			z-index: 0;
		}
	}

	// Main Wrapper
	.listen-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
		padding: 0 var(--space-6);
		padding-bottom: var(--space-8);

		@media (max-width: 768px) {
			padding: 0 var(--space-4);
			gap: var(--space-6);
		}
	}

	// Listen Sections
	.listen-section {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-6);
		border-radius: var(--radius-xl);
		background: linear-gradient(135deg, var(--color-brand-50) 0%, var(--color-purple-50) 100%);
		border: 1px solid var(--border-primary);
		overflow: hidden;

		@media (prefers-color-scheme: dark) {
			background: linear-gradient(135deg, var(--color-brand-900) 0%, var(--color-purple-900) 100%);
		}

		@media (max-width: 768px) {
			padding: var(--space-4);
		}
	}

	// Section Background
	.section-bg {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background-color: var(--bg-surface);
		opacity: 0.6;
		z-index: 0;
		border-radius: var(--radius-xl);

		@media (prefers-color-scheme: dark) {
			opacity: 0.4;
		}
	}

	// Section Header
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-4);
		position: relative;
		z-index: 1;

		@media (max-width: 768px) {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	.section-header__content {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	.section-header__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: var(--radius-lg);
		background-color: var(--color-brand-500);
		color: var(--color-white);
		flex-shrink: 0;
	}

	.section-title {
		margin: 0;
		@include text-display-sm();
		font-weight: 700;
		color: var(--color-gray-900);

		@media (prefers-color-scheme: dark) {
			color: var(--color-white);
		}
	}

	.section-subtitle {
		margin: 0;
		@include text-sm();
		color: var(--color-gray-600);

		@media (prefers-color-scheme: dark) {
			color: var(--color-gray-400);
		}
	}

	.section-header__link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		background-color: var(--color-white);
		color: var(--color-brand-600);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-md);
		text-decoration: none;
		font-weight: 500;
		@include text-sm();
		transition: all var(--duration-normal) var(--easing-ease-out);

		@media (prefers-color-scheme: dark) {
			background-color: var(--color-gray-800);
			color: var(--color-brand-300);
		}

		&:hover {
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

			@media (prefers-color-scheme: dark) {
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
			}
		}

		@media (max-width: 768px) {
			display: none;
		}
	}

	// Section Content
	.section-content {
		position: relative;
		z-index: 1;
	}

	// Tracks Scroll
	.tracks-scroll {
		display: grid;
		grid-auto-flow: column;
		overflow-x: auto;
		overflow-y: hidden;
		grid-auto-columns: minmax(280px, 1fr);
		grid-template-rows: repeat(2, auto);
		gap: var(--space-5);
		padding-bottom: var(--space-2);

		&::-webkit-scrollbar {
			height: 6px;
		}

		&::-webkit-scrollbar-track {
			background: transparent;
		}

		&::-webkit-scrollbar-thumb {
			background: var(--color-gray-400);
			border-radius: 3px;

			&:hover {
				background: var(--color-gray-600);
			}
		}

		@media (max-width: 1024px) {
			grid-auto-columns: minmax(250px, 1fr);
		}

		@media (max-width: 768px) {
			grid-template-rows: repeat(1, auto);
			grid-auto-columns: minmax(200px, 1fr);
		}
	}

	.track-item {
		min-width: 0;
	}

	// Albums Grid
	.albums-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: var(--space-5);

		@media (max-width: 1024px) {
			grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		}

		@media (max-width: 768px) {
			grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
			gap: var(--space-4);
		}
	}

	// Playlists Grid
	.playlists-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: var(--space-5);

		@media (max-width: 1024px) {
			grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		}

		@media (max-width: 768px) {
			grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
			gap: var(--space-4);
		}
	}

	// Empty State
	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 200px;
		text-align: center;

		p {
			margin: 0;
			@include text-md();
			color: var(--color-gray-600);

			@media (prefers-color-scheme: dark) {
				color: var(--color-gray-400);
			}
		}
	}

	// Discovery Section
	.discovery-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		padding: var(--space-8);
		border-radius: var(--radius-xl);
		background: linear-gradient(135deg, var(--color-purple-500) 0%, var(--color-brand-500) 100%);
		color: var(--color-white);

		@media (prefers-color-scheme: dark) {
			background: linear-gradient(135deg, var(--color-purple-900) 0%, var(--color-brand-900) 100%);
		}

		@media (max-width: 768px) {
			padding: var(--space-6) var(--space-4);
		}
	}

	.discovery-header {
		text-align: center;
	}

	.discovery-title {
		margin: 0;
		@include text-display-md();
		font-weight: 700;
	}

	.discovery-subtitle {
		margin: var(--space-2) 0 0 0;
		@include text-lg();
		opacity: 0.95;
	}

	.discovery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: var(--space-5);

		@media (max-width: 1024px) {
			grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		}

		@media (max-width: 768px) {
			grid-template-columns: repeat(2, 1fr);
			gap: var(--space-4);
		}
	}

	.discovery-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		background-color: rgba(255, 255, 255, 0.1);
		border-radius: var(--radius-lg);
		padding: var(--space-3);
		backdrop-filter: blur(8px);
		transition: all var(--duration-normal) var(--easing-ease-out);

		&:hover {
			transform: translateY(-4px);
			background-color: rgba(255, 255, 255, 0.15);
		}
	}

	.discovery-card__cover {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		border-radius: var(--radius-md);
		overflow: hidden;
		background-color: rgba(0, 0, 0, 0.2);

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.discovery-card__overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--duration-normal) var(--easing-ease-out);

		.discovery-card:hover & {
			background: rgba(0, 0, 0, 0.4);
		}
	}

	.discovery-card__play {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background-color: var(--color-white);
		color: var(--color-brand-600);
		border: none;
		cursor: pointer;
		transition: all var(--duration-normal) var(--easing-ease-out);
		transform: scale(0.8);
		opacity: 0;

		.discovery-card:hover & {
			transform: scale(1);
			opacity: 1;
		}

		&:hover {
			background-color: var(--color-brand-50);
			transform: scale(1.1);
		}
	}

	.discovery-card__content {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);

		h3 {
			margin: 0;
			@include text-md();
			font-weight: 600;
		}

		p {
			margin: 0;
			@include text-xs();
			opacity: 0.9;
		}

		span {
			@include text-xs();
			opacity: 0.8;
		}
	}
</style>
