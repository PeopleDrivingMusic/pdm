<script lang="ts">
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import { Button } from '$lib/ui';
	import CampaignCard from './components/CampaignCard.svelte';
	import StatCard from '$lib/ui/StatCard.svelte';
	import {
		mdiMusicBox,
		mdiMicrophone,
		mdiTicket,
		mdiTrendingUp,
		mdiGroup,
		mdiCurrencyUsd,
		mdiPlus,
		mdiMagnify
	} from '@mdi/js';
	import Input from '$lib/ui/Input.svelte';

	interface Campaign {
		id: string;
		type: 'song' | 'album' | 'concert' | 'festival';
		title: string;
		artist: string;
		artistAvatar: string;
		description: string;
		goal: number;
		raised: number;
		backers: number;
		daysLeft: number;
		image: string;
		category?: string;
		isVerified: boolean;
		rewards: Reward[];
		artistStats?: {
			trustScore: number;
			songs: number;
			followers: number;
			subscribers: number;
		};
		revenueShare?: number;
		projectedProfit?: number;
	}

	interface Reward {
		id: string;
		title: string;
		description: string;
		amount: number | string;
		quantity?: number;
		claimed?: number;
	}

	// Mock campaigns data
	const campaigns: Campaign[] = [
		{
			id: '1',
			type: 'album',
			title: 'Neon Nights - Full Album Production',
			artist: 'Luna Echo',
			artistAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luna',
			description:
				'Help me create my debut album with 12 original tracks and professional production',
			goal: 15000,
			raised: 12500,
			backers: 342,
			daysLeft: 15,
			image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
			isVerified: true,
			rewards: [
				{ id: '1', title: 'Revenue Share', description: 'revenue share', amount: "20%" },
				{
					id: '2',
					title: 'Vinyl Copy',
					description: 'Limited edition vinyl',
					amount: 25,
					quantity: 500,
					claimed: 245
				},
				{ id: '3', title: 'Meet & Greet', description: 'Virtual meeting with artist', amount: 100 }
			],
			artistStats: {
				trustScore: 92,
				songs: 24,
				followers: 15800,
				subscribers: 3200
			},
			revenueShare: 35
		},
		{
			id: '2',
			type: 'song',
			title: 'Cosmic Journey - Single Production',
			artist: 'Cosmic Vibes',
			artistAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cosmic',
			description: 'Fund the production of my new single with professional mixing and mastering',
			goal: 5000,
			raised: 3200,
			backers: 128,
			daysLeft: 20,
			image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
			isVerified: true,
			rewards: [
				{ id: '1', title: 'Revenue Share', description: '20% revenue share', amount: "25%"},
				{ id: '2', title: 'Digital Single', description: 'MP3 + WAV format', amount: 3 }
			],
			artistStats: {
				trustScore: 88,
				songs: 12,
				followers: 8900,
				subscribers: 1500
			},
			revenueShare: 25
		},
		{
			id: '3',
			type: 'concert',
			title: 'Aurora Sky World Tour 2024',
			artist: 'Aurora Sky',
			artistAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=aurora',
			description: 'Support my world tour across 15 cities. Fund travel, equipment, and crew',
			goal: 50000,
			raised: 38500,
			backers: 1250,
			daysLeft: 8,
			image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
			isVerified: true,
			rewards: [
				{
					id: '1',
					title: 'Early access to tickets',
					description: 'Get tickets before the general public',
					amount: 35
				},
				{
					id: '2',
					title: 'Early access to entry',
					description: 'Get entry before the general public',
					amount: 35
				},
				{
					id: '3',
					title: 'VIP Package',
					description: 'Front row + meet & greet',
					amount: 150,
					quantity: 100,
					claimed: 47
				}
			],
			artistStats: {
				trustScore: 95,
				songs: 45,
				followers: 125000,
				subscribers: 28000
			},
			projectedProfit: 180000
		},
		{
			id: '4',
			type: 'festival',
			title: 'PDM Music Festival 2024',
			artist: 'PDM Presents',
			artistAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pdmfest',
			description: 'Help us organize the biggest music festival with 50+ artists',
			goal: 100000,
			raised: 85000,
			backers: 3500,
			daysLeft: 12,
			image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
			isVerified: true,
			rewards: [
				{ id: '1', title: 'Profit Share', description: '20% revenue share', amount: "100%" },
				{ id: '2', title: 'Digital Single', description: 'MP3 + WAV format', amount: 3 }
			],
			projectedProfit: 350000
		},
		{
			id: '5',
			type: 'album',
			title: 'Future Sounds - Experimental Album',
			artist: 'Neon Dreams',
			artistAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=neon',
			description: 'Creating an experimental electronic album with cutting-edge production',
			goal: 20000,
			raised: 8900,
			backers: 267,
			daysLeft: 25,
			image: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=800',
			isVerified: false,
			rewards: [
				{ id: '1', title: 'Revenue Share', description: '80% revenue share', amount: "80%" },
				{ id: '2', title: 'Digital Single', description: 'MP3 + WAV format', amount: 3 }
			],
			artistStats: {
				trustScore: 78,
				songs: 18,
				followers: 5600,
				subscribers: 890
			},
			revenueShare: 40
		}
	];

	// Statistics
	const stats = [
		{ label: 'Total Raised', value: '$347.5K', icon: mdiCurrencyUsd, color: 'brand' },
		{ label: 'Active Campaigns', value: '24', icon: mdiTrendingUp, color: 'green' },
		{ label: 'Backers', value: '12.5K', icon: mdiGroup, color: 'blue' },
		{ label: 'Success Rate', value: '94%', icon: mdiMusicBox, color: 'purple' }
	];

	let filteredCampaigns = $state([...campaigns]);
	let selectedType = $state('all');
	let searchQuery = $state('');
	let sortBy = $state('trending');

	const typeFilters = [
		{ value: 'all', label: 'All Campaigns', icon: mdiMusicBox },
		{ value: 'song', label: 'Songs', icon: mdiMicrophone },
		{ value: 'album', label: 'Albums', icon: mdiMusicBox },
		{ value: 'concert', label: 'Concerts', icon: mdiTicket },
		{ value: 'festival', label: 'Festivals', icon: mdiTrendingUp }
	];

	const sortOptions = [
		{ value: 'trending', label: 'Trending' },
		{ value: 'newest', label: 'Newest' },
		{ value: 'ending-soon', label: 'Ending Soon' },
		{ value: 'most-backed', label: 'Most Backed' }
	];

	function handleFilterChange(type: string) {
		selectedType = type;
		filterCampaigns();
	}

	function handleSearch(query: string) {
		debugger;
		searchQuery = query;
		filterCampaigns();
	}

	function handleSort(sort: string) {
		sortBy = sort;
		filterCampaigns();
	}

	function filterCampaigns() {
		let filtered = [...campaigns];

		// Filter by type
		if (selectedType !== 'all') {
			filtered = filtered.filter((c) => c.type === selectedType);
		}

		// Filter by search
		if (searchQuery) {
			filtered = filtered.filter(
				(c) =>
					c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					c.artist.toLowerCase().includes(searchQuery.toLowerCase())
			);
		}

		// Sort
		filtered.sort((a, b) => {
			switch (sortBy) {
				case 'trending':
					return b.raised / b.goal - a.raised / a.goal;
				case 'newest':
					return b.daysLeft - a.daysLeft;
				case 'ending-soon':
					return a.daysLeft - b.daysLeft;
				case 'most-backed':
					return b.backers - a.backers;
				default:
					return 0;
			}
		});

		filteredCampaigns = filtered;
	}
</script>

<div class="crowdfunding-page">
	<!-- Hero Section -->
	<section class="crowdfunding-hero">
		<div class="hero-bg"></div>

		<div class="hero-content">
			<h1 class="hero-title">Fund Your Music Dreams</h1>
			<p class="hero-subtitle">
				Support artists and receive exclusive rewards. Together we create amazing music.
			</p>

			<div class="hero-actions">
				<Button variant="primary" size="lg">
					<SvgIcon path={mdiPlus} size={20} />
					Start a Campaign
				</Button>
				<Button variant="secondary" size="lg">
					<SvgIcon path={mdiGroup} size={20} />
					Become a Backer
				</Button>
			</div>
		</div>
	</section>

	<!-- Statistics -->
	<section class="stats-section">
		<div class="stats-grid">
			{#each stats as stat (stat.label)}
				<div class="stat-item">
					<div class="stat-icon" style={`--stat-color: var(--color-${stat.color}-500)`}>
						<SvgIcon path={stat.icon} size={24} />
					</div>
					<div class="stat-content">
						<p class="stat-label">{stat.label}</p>
						<p class="stat-value">{stat.value}</p>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Main Content -->
	<div class="crowdfunding-wrapper">
		<!-- Search & Filters Header -->
		<section class="campaigns-header">
			<!-- Search Box -->
			<div class="search-box">
				<input
					type="text"
					class="search-box__input"
					placeholder="Search campaigns..."
					value={searchQuery}
					oninput={(e) => handleSearch((e.target as HTMLInputElement).value)}
				/>
			</div>

			<!-- Type Filters -->
			<div class="filter-buttons">
				{#each typeFilters as filter (filter.value)}
					<button
						class="filter-btn"
						class:filter-btn--active={selectedType === filter.value}
						onclick={() => handleFilterChange(filter.value)}
					>
						<SvgIcon path={filter.icon} size={16} />
						<span>{filter.label}</span>
					</button>
				{/each}
			</div>

			<!-- Sort Dropdown -->
			<div class="sort-box">
				<label for="sort">Sort by:</label>
				<select
					id="sort"
					class="sort-select"
					value={sortBy}
					onchange={(e) => handleSort((e.target as HTMLSelectElement).value)}
				>
					{#each sortOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
		</section>

		<!-- Campaigns Grid -->
		<main class="campaigns-main">
			{#if filteredCampaigns.length > 0}
				<div class="campaigns-grid">
					{#each filteredCampaigns as campaign (campaign.id)}
						<CampaignCard {campaign} />
					{/each}
				</div>
			{:else}
				<div class="empty-state">
					<SvgIcon path={mdiMusicBox} size={64} />
					<h3>No campaigns found</h3>
					<p>Try adjusting your filters or search terms</p>
				</div>
			{/if}
		</main>
	</div>

	<!-- CTA Section -->
	<section class="cta-section">
		<div class="cta-content">
			<h2>Ready to Create?</h2>
			<p>Artists can launch campaigns to fund their music projects and share in the success</p>
			<div class="cta-features">
				<div class="feature">
					<SvgIcon path={mdiMusicBox} size={24} />
					<div>
						<h4>Create Campaigns</h4>
						<p>Fund albums, songs, tours, or festivals</p>
					</div>
				</div>
				<div class="feature">
					<SvgIcon path={mdiGroup} size={24} />
					<div>
						<h4>Share Revenue</h4>
						<p>Backers earn a percentage of music sales</p>
					</div>
				</div>
				<div class="feature">
					<SvgIcon path={mdiCurrencyUsd} size={24} />
					<div>
						<h4>Transparent Earnings</h4>
						<p>Real-time tracking of income distribution</p>
					</div>
				</div>
			</div>
			<Button variant="primary" size="lg">Launch Your Campaign</Button>
		</div>
	</section>
</div>

<style lang="scss">
	.crowdfunding-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
		min-height: 100vh;
		padding-bottom: var(--space-8);
	}

	// Hero Section
	.crowdfunding-hero {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
		padding: var(--space-12) var(--space-6);
		border-radius: var(--radius-xl);
		margin: 0 var(--space-6);
		color: var(--color-white);
		overflow: hidden;

		@media (max-width: 768px) {
			margin: 0;
			border-radius: 0;
			padding: var(--space-8) var(--space-4);
		}
	}

	.hero-bg {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-purple-600) 100%);
		z-index: -1;

		@media (prefers-color-scheme: dark) {
			background: linear-gradient(135deg, var(--color-brand-900) 0%, var(--color-purple-900) 100%);
		}

		&::before {
			content: '';
			position: absolute;
			width: 500px;
			height: 500px;
			border-radius: 50%;
			background: rgba(255, 255, 255, 0.1);
			top: -150px;
			right: -100px;
		}

		&::after {
			content: '';
			position: absolute;
			width: 400px;
			height: 400px;
			border-radius: 50%;
			background: rgba(255, 255, 255, 0.05);
			bottom: -100px;
			left: 50px;
		}
	}

	.hero-content {
		position: relative;
		z-index: 1;
		max-width: 700px;
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		align-items: center;
	}

	.hero-title {
		margin: 0;
		@include text-display-lg();
		font-weight: 700;
	}

	.hero-subtitle {
		margin: 0;
		@include text-lg();
		opacity: 0.95;
	}

	.hero-actions {
		display: flex;
		gap: var(--space-4);
		flex-wrap: wrap;
		justify-content: center;

		@media (max-width: 768px) {
			flex-direction: column;
			width: 100%;
		}
	}

	// Statistics Section
	.stats-section {
		padding: 0 var(--space-6);

		@media (max-width: 768px) {
			padding: 0 var(--space-4);
		}
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: var(--space-6);

		@media (max-width: 768px) {
			grid-template-columns: repeat(2, 1fr);
			gap: var(--space-4);
		}
	}

	.stat-item {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-6);
		background-color: var(--bg-primary);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-lg);
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

	.stat-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		border-radius: var(--radius-lg);
		background-color: var(--stat-color, var(--color-brand-500));
		color: var(--color-white);
		flex-shrink: 0;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.stat-label {
		margin: 0;
		@include text-sm();
		color: var(--color-gray-600);
		text-transform: uppercase;
		letter-spacing: var(--letter-spacing-wide);
		font-weight: 500;

		@media (prefers-color-scheme: dark) {
			color: var(--color-gray-400);
		}
	}

	.stat-value {
		margin: 0;
		@include text-display-sm();
		font-weight: 700;
		color: var(--color-gray-900);

		@media (prefers-color-scheme: dark) {
			color: var(--color-white);
		}
	}

	// Main Wrapper
	.crowdfunding-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		padding: 0 var(--space-6);

		@media (max-width: 768px) {
			padding: 0;
			gap: var(--space-4);
		}
	}

	// Header with Search & Filters
	.campaigns-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		background-color: var(--bg-primary);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-primary);
		padding: var(--space-4);

		@media (max-width: 768px) {
			border-radius: 0;
			border-top: 1px solid var(--border-primary);
			border-bottom: 1px solid var(--border-primary);
			padding: var(--space-4);
		}
	}

	// Search Box
	.search-box {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-box__icon {
		position: absolute;
		left: var(--space-4);
		color: var(--color-gray-400);
	}

	.search-box__input {
		width: 100%;
		padding: var(--space-3) var(--space-4);
		padding-left: var(--space-10);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-lg);
		background-color: var(--color-gray-50);
		color: var(--color-gray-900);
		@include text-sm();
		font-family: var(--font-family-sans);
		transition: all var(--duration-normal) var(--easing-ease-out);

		@media (prefers-color-scheme: dark) {
			background-color: var(--color-gray-900);
			color: var(--color-white);
		}

		&:focus {
			outline: none;
			border-color: var(--color-brand-500);
			box-shadow: 0 0 0 3px var(--color-brand-50);

			@media (prefers-color-scheme: dark) {
				box-shadow: 0 0 0 3px var(--color-brand-900);
			}
		}

		&::placeholder {
			color: var(--color-gray-500);
		}
	}

	// Filter Buttons
	.filter-buttons {
		display: flex;
		gap: var(--space-2);
		overflow-x: auto;
		padding-bottom: var(--space-2);

		&::-webkit-scrollbar {
			height: 4px;
		}

		&::-webkit-scrollbar-track {
			background: transparent;
		}

		&::-webkit-scrollbar-thumb {
			background-color: var(--color-gray-300);
			border-radius: 2px;
		}
	}

	.filter-btn {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background-color: var(--bg-primary);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-md);
		color: var(--color-gray-700);
		@include text-sm();
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-fast) var(--easing-ease-out);
		white-space: nowrap;
		flex-shrink: 0;

		@media (prefers-color-scheme: dark) {
			color: var(--color-gray-300);
		}

		&:hover {
			border-color: var(--color-brand-500);
			color: var(--color-brand-600);

			@media (prefers-color-scheme: dark) {
				color: var(--color-brand-400);
			}
		}

		&--active {
			background-color: var(--color-brand-500);
			border-color: var(--color-brand-500);
			color: var(--color-white);
		}
	}

	// Sort Box
	.sort-box {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		@include text-sm();

		label {
			font-weight: 500;
			color: var(--color-gray-700);

			@media (prefers-color-scheme: dark) {
				color: var(--color-gray-300);
			}
		}
	}

	.sort-select {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-md);
		background-color: var(--bg-primary);
		color: var(--color-gray-900);
		@include text-sm();
		cursor: pointer;
		font-family: var(--font-family-sans);
		transition: all var(--duration-normal) var(--easing-ease-out);

		@media (prefers-color-scheme: dark) {
			color: var(--color-white);
		}

		&:focus {
			outline: none;
			border-color: var(--color-brand-500);
			box-shadow: 0 0 0 3px var(--color-brand-50);

			@media (prefers-color-scheme: dark) {
				box-shadow: 0 0 0 3px var(--color-brand-900);
			}
		}
	}

	// Campaigns Main
	.campaigns-main {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	// Campaigns Grid
	.campaigns-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--space-6);

		@media (max-width: 1024px) {
			grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		}

		@media (max-width: 768px) {
			grid-template-columns: 1fr;
			padding: 0 var(--space-4);
			gap: var(--space-4);
		}
	}

	// Empty State
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		padding: var(--space-12);
		text-align: center;
		color: var(--color-gray-600);

		@media (prefers-color-scheme: dark) {
			color: var(--color-gray-400);
		}

		:global(svg) {
			opacity: 0.5;
		}

		h3 {
			margin: 0;
			@include text-lg();
			font-weight: 600;
		}

		p {
			margin: 0;
			@include text-sm();
		}
	}

	// CTA Section
	.cta-section {
		margin: 0 var(--space-6);
		padding: var(--space-8);
		border-radius: var(--radius-xl);
		background: linear-gradient(135deg, var(--color-purple-500) 0%, var(--color-brand-500) 100%);
		color: var(--color-white);

		@media (prefers-color-scheme: dark) {
			background: linear-gradient(135deg, var(--color-purple-900) 0%, var(--color-brand-900) 100%);
		}

		@media (max-width: 768px) {
			margin: 0;
			border-radius: 0;
			padding: var(--space-6) var(--space-4);
		}
	}

	.cta-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		text-align: center;
		max-width: 800px;
		margin: 0 auto;
	}

	.cta-content h2 {
		margin: 0;
		@include text-display-md();
		font-weight: 700;
	}

	.cta-content > p {
		margin: 0;
		@include text-lg();
		opacity: 0.95;
	}

	.cta-features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: var(--space-6);
		margin: var(--space-4) 0;
	}

	.feature {
		display: flex;
		align-items: flex-start;
		gap: var(--space-4);
		padding: var(--space-4);
		background-color: rgba(255, 255, 255, 0.1);
		border-radius: var(--radius-lg);
		backdrop-filter: blur(8px);

		:global(svg) {
			flex-shrink: 0;
		}

		h4 {
			margin: 0 0 var(--space-1) 0;
			@include text-md();
			font-weight: 600;
		}

		p {
			margin: 0;
			@include text-sm();
			opacity: 0.9;
		}
	}
</style>
