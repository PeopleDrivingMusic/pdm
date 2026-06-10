<script lang="ts">
	import { Button } from '$lib/ui';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import Avatar from '$lib/ui/Avatar.svelte';
	import ArtistPostCard from './home/components/ArtistPostCard.svelte';
	import AnnouncementCard from './home/components/AnnouncementCard.svelte';
	import EventCard from './home/components/EventCard.svelte';
	import RecommendationCard from './home/components/RecommendationCard.svelte';
	import QuickLinksSection from './home/components/QuickLinksSection.svelte';
	import {
		mdiMusicBoxMultiple,
		mdiStar,
		mdiCalendarCheck,
		mdiTrendingUp,
		mdiBell,
		mdiRefresh
	} from '@mdi/js';

	interface Post {
		id: string;
		artistName: string;
		artistAvatar: string;
		content: string;
		timestamp: string;
		likes: number;
		comments: number;
		liked: boolean;
	}

	interface Announcement {
		id: string;
		type: 'new-album' | 'new-single' | 'milestone' | 'collab';
		title: string;
		description: string;
		image: string;
		artistName: string;
		date: string;
	}

	interface Event {
		id: string;
		title: string;
		artists: string[];
		date: string;
		time: string;
		location: string;
		distance: string;
		image: string;
		interested: number;
	}

	interface Recommendation {
		id: string;
		trackName: string;
		artistName: string;
		image: string;
		reason: string; // "Recommended based on your subscriptions"
	}

	// Mock data
	const posts: Post[] = [
		{
			id: '1',
			artistName: 'Metallica',
			artistAvatar: '/artists/m.jpg',
			content:
				'🎵 Excited to announce that our new album "Midnight Dreams" drops next Friday! Pre-order is live now.',
			timestamp: '2 hours ago',
			likes: 1245,
			comments: 89,
			liked: false
		},
		{
			id: '2',
			artistName: 'Linkin Park',
			artistAvatar: '/artists/LP.png',
			content:
				'Just finished recording the final tracks for our upcoming EP. Cannot wait for you all to hear it!',
			timestamp: '4 hours ago',
			likes: 892,
			comments: 145,
			liked: true
		}
	];

	const announcements: Announcement[] = [
		{
			id: '1',
			type: 'new-album',
			title: 'New Album Release',
			description: 'Metallica releases "72 Seasons"',
			image: '/albums/Metallica-72-Seasons.png',
			artistName: 'Metallica',
			date: '2025-11-24'
		},
		{
			id: '2',
			type: 'new-single',
			title: 'New Single',
			description: 'Linkin Park - "From Zero"',
			image: '/albums/From_Zero.jpg',
			artistName: 'Linkin Park',
			date: '2025-11-20'
		},
		{
			id: '3',
			type: 'collab',
			title: 'Collaboration',
			description: 'Metallica x Miley Cyrus - exclusive single',
			image: '/albums/M&M.jpg',
			artistName: 'Metallica&Miley Cyrus',
			date: '2025-12-01'
		}
	];

	const events: Event[] = [
		{
			id: '1',
			title: 'Rock am Ring 2025',
			artists: ['Slipknot'],
			date: '2025-12-15',
			time: '20:00',
			location: 'Nürburgring',
			distance: '2.3 km away',
			image: '/rock_am_ring.jpeg',
			interested: 3421
		},
		{
			id: '2',
			title: 'Muse - Live Session',
			artists: ['Muse'],
			date: '2025-12-20',
			time: '19:00',
			location: 'Debaser Strand',
			distance: '1.8 km away',
			image: '/muse.webp',
			interested: 2156
		},
		{
			id: '3',
			title: 'Winter Festival',
			artists: ['Aurora', 'The Midnight', 'Grimes'],
			date: '2025-12-28',
			time: '18:00',
			location: 'Stockholm Park',
			distance: '5.2 km away',
			image: '/bg/bg1.jpg',
			interested: 8932
		}
	];

	const recommendations: Recommendation[] = [
		{
			id: '1',
			trackName: 'Runaway',
			artistName: 'Aurora',
			image: '/tracks/enter_sandman.jpg',
			reason: 'Based on your subscriptions'
		},
		{
			id: '2',
			trackName: 'Sunset',
			artistName: 'The Midnight',
			image: '/tracks/ACDCPowerUp.jpg',
			reason: 'Popular among your followed artists'
		},
		{
			id: '3',
			trackName: 'Dreams',
			artistName: 'Grimes',
			image: '/tracks/GunsnRosesUseYourIllusionII.jpg',
			reason: 'Similar to your favorites'
		}
	];

	let refreshing = $state(false);

	function handleRefresh() {
		refreshing = true;
		setTimeout(() => {
			refreshing = false;
		}, 1000);
	}
</script>

<div class="home-page">
	<!-- Header Section -->
	<header class="home-header">
		<div class="header-content">
			<div>
				<h1 class="header-title">Welcome back!</h1>
				<p class="header-subtitle">Here's what's happening with your favorite artists</p>
			</div>
			<button class="refresh-btn" on:click={handleRefresh} class:refreshing disabled={refreshing}>
				<SvgIcon path={mdiRefresh} size={20} />
			</button>
		</div>
	</header>

	<div class="home-container">
		<!-- Main Feed -->
		<main class="feed-section">
			<!-- Section: Artist Posts -->
			<section class="feed-block">
				<div class="section-header">
					<div class="section-title">
						<SvgIcon path={mdiMusicBoxMultiple} size={24} />
						<h2>Artist Posts</h2>
					</div>
					<a href="/posts" class="view-all-link">View all</a>
				</div>
				<div class="posts-grid">
					{#each posts as post (post.id)}
						<ArtistPostCard {post} />
					{/each}
				</div>
			</section>

			<!-- Section: Announcements -->
			<section class="feed-block">
				<div class="section-header">
					<div class="section-title">
						<SvgIcon path={mdiStar} size={24} />
						<h2>What's New</h2>
					</div>
					<a href="/announcements" class="view-all-link">View all</a>
				</div>
				<div class="announcements-grid">
					{#each announcements as announcement (announcement.id)}
						<AnnouncementCard {announcement} />
					{/each}
				</div>
			</section>

			<!-- Section: Upcoming Events -->
			<section class="feed-block">
				<div class="section-header">
					<div class="section-title">
						<SvgIcon path={mdiCalendarCheck} size={24} />
						<h2>Events Near You</h2>
					</div>
					<a href="/events" class="view-all-link">View all</a>
				</div>
				<div class="events-grid">
					{#each events as event (event.id)}
						<EventCard {event} />
					{/each}
				</div>
			</section>

			<!-- Section: Recommendations -->
			<section class="feed-block">
				<div class="section-header">
					<div class="section-title">
						<SvgIcon path={mdiTrendingUp} size={24} />
						<h2>Recommended for You</h2>
					</div>
					<a href="/discover" class="view-all-link">Discover more</a>
				</div>
				<div class="recommendations-grid">
					{#each recommendations as rec (rec.id)}
						<RecommendationCard recommendation={rec} />
					{/each}
				</div>
			</section>
		</main>

		<!-- Sidebar -->
		<aside class="sidebar">
			<!-- Quick Links -->
			<QuickLinksSection />

			<!-- Upcoming Notifications -->
			<section class="sidebar-block">
				<div class="sidebar-header">
					<SvgIcon path={mdiBell} size={20} />
					<h3>Coming Soon</h3>
				</div>
				<div class="coming-soon-list">
					<div class="coming-soon-item">
						<div class="coming-soon-dot"></div>
						<div>
							<p class="coming-soon-title">Aurora - New Release</p>
							<p class="coming-soon-date">Nov 24</p>
						</div>
					</div>
					<div class="coming-soon-item">
						<div class="coming-soon-dot"></div>
						<div>
							<p class="coming-soon-title">The Midnight Tour</p>
							<p class="coming-soon-date">Dec 15</p>
						</div>
					</div>
					<div class="coming-soon-item">
						<div class="coming-soon-dot"></div>
						<div>
							<p class="coming-soon-title">Grimes Q&A Live</p>
							<p class="coming-soon-date">Dec 1</p>
						</div>
					</div>
				</div>
			</section>

			<!-- Suggestions -->
			<section class="sidebar-block">
				<div class="sidebar-header">
					<SvgIcon path={mdiStar} size={20} />
					<h3>Follow More Artists</h3>
				</div>
				<div class="suggestions-list">
					{#each Array(3) as _, i (i)}
						<div class="suggestion-item">
							<div class="suggestion-info-wrapper">
								<Avatar name="Artist Name" size="md" />
								<div class="suggestion-info">
									<p class="suggestion-name">Artist {i + 1}</p>
									<p class="suggestion-followers">24.5K followers</p>
								</div>
							</div>
							<div class="suggestion-actions">
								<Button variant="secondary" size="md">Follow</Button>
								<Button variant="primary" size="md">Subscribe</Button>

							</div>
						</div>
					{/each}
				</div>
			</section>
		</aside>
	</div>
</div>

<style lang="scss">
	.home-page {
		padding: var(--space-6);
		background: var(--bg-primary);
		color: var(--text-primary);
		min-height: 100vh;
	}

	.home-header {
		margin-bottom: var(--space-10);
		padding-bottom: var(--space-6);
		border-bottom: 1px solid var(--color-gray-200);

		@media (prefers-color-scheme: dark) {
			border-bottom-color: var(--color-gray-800);
		}
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-title {
		@include text-display-md();
		margin-bottom: var(--space-2);
		background: linear-gradient(135deg, var(--primary) 0%, var(--brand-300) 100%);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.header-subtitle {
		@include text-lg();
		color: var(--text-secondary);
	}

	.refresh-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-gray-200);
		background: var(--bg-secondary);
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.3s ease;

		@media (prefers-color-scheme: dark) {
			border-color: var(--color-gray-800);
			background: var(--color-gray-900);
		}

		&:hover:not(:disabled) {
			border-color: var(--primary);
			background: var(--color-brand-50);

			@media (prefers-color-scheme: dark) {
				background: var(--color-brand-900);
			}
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		&.refreshing {
			animation: spin 1s linear infinite;
		}
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.home-container {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-8);

		@media (max-width: 1400px) {
			grid-template-columns: 1fr;
		}
	}

	.feed-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.feed-block {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-2);
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: var(--space-3);

		h2 {
			@include text-display-xs();
			margin: 0;
			color: var(--text-primary);
		}
	}

	.view-all-link {
		@include text-sm();
		@include font-medium();
		color: var(--primary);
		text-decoration: none;
		transition: opacity 0.2s ease;

		&:hover {
			opacity: 0.8;
		}
	}

	.posts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
		gap: var(--space-4);

		@media (max-width: 768px) {
			grid-template-columns: 1fr;
		}
	}

	.announcements-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--space-4);

		@media (max-width: 768px) {
			grid-template-columns: 1fr;
		}
	}

	.events-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--space-4);

		@media (max-width: 768px) {
			grid-template-columns: 1fr;
		}
	}

	.recommendations-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-4);

		@media (max-width: 768px) {
			grid-template-columns: 1fr;
		}
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);

		@media (max-width: 1400px) {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
			gap: var(--space-6);
		}

		@media (max-width: 768px) {
			display: flex;
			flex-direction: column;
		}
	}

	.sidebar-block {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--bg-secondary);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-gray-200);

		@media (prefers-color-scheme: dark) {
			border-color: var(--color-gray-800);
		}
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);

		h3 {
			@include text-md();
			@include font-semibold();
			margin: 0;
			color: var(--text-primary);
		}
	}

	.coming-soon-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.coming-soon-item {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		padding: var(--space-3);
		background: var(--bg-primary);
		border-radius: var(--radius-md);
		transition: background 0.2s ease;

		&:hover {
			background: var(--color-gray-50);

			@media (prefers-color-scheme: dark) {
				background: var(--color-gray-800);
			}
		}
	}

	.coming-soon-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--primary);
		flex-shrink: 0;
		margin-top: 6px;
	}

	.coming-soon-title {
		@include text-sm();
		@include font-medium();
		margin: 0;
		color: var(--text-primary);
	}

	.coming-soon-date {
		@include text-xs();
		margin: var(--space-1) 0 0 0;
		color: var(--text-secondary);
	}

	.suggestions-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.suggestion-item {
		display: flex;
		align-items: start;
		gap: var(--space-5);
		justify-content: space-between;
		padding: var(--space-3);
		background: var(--bg-primary);
		border-radius: var(--radius-md);
		transition: background 0.2s ease;

		&:hover {
			background: var(--color-gray-50);

			@media (prefers-color-scheme: dark) {
				background: var(--color-gray-800);
			}
		}

		.suggestion-actions {
			display: flex;
			gap: var(--space-2);
		}
	}
	.suggestion-info-wrapper {
		display: flex;
		gap: var(--space-2);
		flex-shrink: 0;
	}

	.suggestion-info {
		flex: 1;
		min-width: 0;
	}

	.suggestion-name {
		@include text-sm();
		@include font-medium();
		margin: 0;
		color: var(--text-primary);
	}

	.suggestion-followers {
		@include text-xs();
		margin: var(--space-1) 0 0 0;
		color: var(--text-secondary);
	}
</style>
