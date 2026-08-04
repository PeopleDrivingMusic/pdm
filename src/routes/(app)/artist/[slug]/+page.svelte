<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { subscribeToArtist, unsubscribeFromArtist } from '$lib/client/subscription';
	import { Avatar, Button, Tabs } from '$lib/ui';
	import ArtistTracks from './components/ArtistTracks.svelte';
	import ArtistAlbums from './components/ArtistAlbums.svelte';
	import ArtistFeed from './components/ArtistFeed.svelte';
	import ArtistPosts from './components/ArtistPosts.svelte';
	import ArtistPhotos from './components/ArtistPhotos.svelte';
	import ArtistVideos from './components/ArtistVideos.svelte';
	import ArtistSidebarPhotos from './components/ArtistSidebarPhotos.svelte';

	const { artist, viewer, tracks, albums, content } = $derived(page.data as PageData);

	const tabs = [
		{ label: 'Feed', id: 'feed' },
		{ label: 'Music', id: 'music' },
		{ label: 'Posts', id: 'posts' },
		{ label: 'Photos', id: 'photos' },
		{ label: 'Videos', id: 'videos' },
		{ label: 'Shop', id: 'shop' }
	];

	let activeTab = $state(tabs[0]);
	let busy = $state(false);
	let ctaError = $state('');

	async function runSubscription(
		action: (artistId: string) => Promise<{ ok: boolean; error?: string }>
	) {
		busy = true;
		ctaError = '';
		const result = await action(artist.id);
		if (!result.ok) ctaError = result.error ?? 'Something went wrong. Please try again.';
		busy = false;
	}

	const subscribe = () => runSubscription(subscribeToArtist);
	const unsubscribe = () => runSubscription(unsubscribeFromArtist);
</script>

<div class="artist-page">
	<main class="main-content">
		<header class="hero">
			<div
				class="cover"
				style:background-image={artist?.coverImg ? `url('${artist.coverImg}')` : undefined}
			></div>
			<div class="hero-content">
				<div class="identity">
					<Avatar size="lg" src={artist.avatar} name={artist.name} />
					<div>
						<p class="eyebrow">Artist</p>
						<h1>{artist?.name || 'Unknown Artist'}</h1>
					</div>
				</div>
				<div class="actions">
					<Button variant="secondary">Follow</Button>
					{#if viewer.isOwner}
						<span class="owner-note">Your page</span>
					{:else if viewer.isSubscribed}
						<Button variant="secondary" onClick={unsubscribe} disabled={busy}
							>Subscribed &check;</Button
						>
					{:else if viewer.canSubscribe}
						<Button onClick={subscribe} disabled={busy}>Subscribe &middot; $1/mo</Button>
					{:else if !viewer.isLoggedIn}
						<Button href="/login" variant="secondary">Log in to subscribe</Button>
					{/if}
					{#if ctaError}
						<span class="cta-error" role="alert">{ctaError}</span>
					{/if}
				</div>
			</div>
		</header>

		<section class="content-surface">
			<Tabs {tabs} bind:activeTab type="pill" />

			{#if activeTab.id === 'feed'}
				<section class="section-block">
					<div class="section-heading">
						<div>
							<p class="eyebrow">Latest</p>
							<h2>Artist feed</h2>
						</div>
					</div>
					<ArtistFeed {content} />
				</section>

				<section class="section-block">
					<div class="section-heading">
						<div>
							<p class="eyebrow">Music</p>
							<h2>Top tracks</h2>
						</div>
					</div>
					<ArtistTracks {artist} {tracks} {albums} />
				</section>
			{:else if activeTab.id === 'music'}
				<section class="section-block">
					<div class="section-heading">
						<div>
							<p class="eyebrow">Catalog</p>
							<h2>Tracks</h2>
						</div>
					</div>
					<ArtistTracks {artist} {tracks} {albums} />
				</section>

				<section class="section-block">
					<div class="section-heading">
						<div>
							<p class="eyebrow">Releases</p>
							<h2>Albums</h2>
						</div>
					</div>
					<ArtistAlbums {artist} {albums} />
				</section>
			{:else if activeTab.id === 'posts'}
				<section class="section-block">
					<div class="section-heading">
						<div>
							<p class="eyebrow">Updates</p>
							<h2>Posts</h2>
						</div>
					</div>
					<ArtistPosts {artist} {tracks} {albums} {content} />
				</section>
			{:else if activeTab.id === 'photos'}
				<section class="section-block">
					<div class="section-heading">
						<div>
							<p class="eyebrow">Gallery</p>
							<h2>Photo albums</h2>
						</div>
					</div>
					<ArtistPhotos {content} />
				</section>
			{:else if activeTab.id === 'videos'}
				<section class="section-block">
					<div class="section-heading">
						<div>
							<p class="eyebrow">Watch</p>
							<h2>Videos and playlists</h2>
						</div>
					</div>
					<ArtistVideos {content} />
				</section>
			{:else}
				<div class="empty-state">Shop is coming soon.</div>
			{/if}
		</section>
	</main>

	<aside class="side-content">
		<section class="sidebar-card">
			<div class="section-heading compact">
				<div>
					<p class="eyebrow">Community</p>
					<h2>Fan room</h2>
				</div>
				<span class="online-dot"></span>
			</div>
			<div class="chat-preview">
				{#each Array(6) as _, index}
					<div class="message-row">
						<Avatar size="s" name={`User ${index + 1}`} />
						<span>Fan message {index + 1}</span>
					</div>
				{/each}
			</div>
		</section>

		<section class="sidebar-card">
			<div class="section-heading compact">
				<div>
					<p class="eyebrow">Photos</p>
					<h2>Latest shots</h2>
				</div>
			</div>
			<ArtistSidebarPhotos {content} />
		</section>
	</aside>
</div>

<style lang="scss">
	.artist-page {
		width: 100%;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
		gap: var(--space-7, 2rem);
		align-items: start;
	}

	.main-content,
	.side-content {
		min-width: 0;
	}

	.side-content {
		position: sticky;
		top: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.hero {
		overflow: hidden;
		position: relative;
		border-radius: var(--radius-xl, 24px);
		background:
			radial-gradient(
				circle at 18% 18%,
				color-mix(in srgb, var(--primary) 18%, transparent),
				transparent 34%
			),
			linear-gradient(
				135deg,
				color-mix(in srgb, var(--bg-tertiary) 92%, var(--primary)),
				var(--bg-primary)
			);
		box-shadow: 0 18px 56px rgba(0, 0, 0, 0.24);
	}

	.cover {
		height: clamp(190px, 24vw, 240px);
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.08), transparent 42%),
			linear-gradient(180deg, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.34)),
			linear-gradient(135deg, var(--bg-tertiary), var(--bg-primary));
		background-size: cover;
		background-position: top;
		position: relative;

		&::after {
			content: '';
			position: absolute;
			inset: 0;
			pointer-events: none;
			background: linear-gradient(
				180deg,
				transparent 55%,
				color-mix(in srgb, var(--bg-primary) 88%, transparent)
			);
		}
	}

	.hero-content {
		position: absolute;
		bottom: 0;
		z-index: 1;
		display: flex;
		justify-content: space-between;
		gap: var(--space-4);
		padding: 0 var(--space-6, 1.5rem) var(--space-6, 1.5rem);
	}

	.identity {
		display: flex;
		align-items: flex-end;
		gap: var(--space-4);

		h1 {
			margin: 0;
			font-size: clamp(2rem, 3.4vw, 3.25rem);
			line-height: 1;
			color: var(--text-primary);
		}
	}

	.eyebrow {
		margin: 0 0 var(--space-1);
		color: var(--primary);
		font-size: var(--font-size-xs);
		font-weight: 700;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-shrink: 0;
		padding-top: var(--space-5);
	}

	.owner-note {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.cta-error {
		color: var(--error, #e5484d);
		font-size: var(--font-size-sm);
		align-self: center;
	}

	.content-surface,
	.sidebar-card,
	.section-block {
		border-radius: var(--radius-lg);
	}

	.content-surface {
		margin-top: var(--space-5);
		padding: 0 var(--space-5) var(--space-6);
		display: flex;
		flex-direction: column;
		gap: var(--space-6, 1.5rem);
		background: transparent;
	}

	.section-block {
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		background: transparent;
	}

	.section-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);

		h2 {
			margin: 0;
			color: var(--text-primary);
			font-size: var(--font-size-2xl);
			line-height: 1.2;
		}

		&.compact h2 {
			font-size: var(--font-size-lg);
		}
	}

	.sidebar-card {
		padding: var(--space-5);
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.03), transparent 48%),
			color-mix(in srgb, var(--bg-surface) 72%, var(--bg-primary));
		box-shadow: 0 14px 44px rgba(0, 0, 0, 0.18);
	}

	.online-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--success);
		box-shadow: 0 0 0 5px color-mix(in srgb, var(--success) 18%, transparent);
	}

	.chat-preview {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-top: var(--space-3);
	}

	.message-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) 0;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
	}

	.empty-state {
		padding: var(--space-6);
		border: 1px dashed color-mix(in srgb, var(--border-primary) 58%, transparent);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--bg-surface) 46%, transparent);
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		text-align: center;
	}

	@media (max-width: 1100px) {
		.artist-page {
			grid-template-columns: 1fr;
		}

		.side-content {
			position: static;
		}
	}

	@media (max-width: 720px) {
		.cover {
			height: 180px;
		}

		.hero-content {
			flex-direction: column;
			margin-top: -48px;
			padding: 0 var(--space-4) var(--space-4);
		}

		.identity {
			align-items: flex-end;
		}

		.actions {
			width: 100%;
			padding-top: 0;

			:global(.btn) {
				flex: 1;
			}
		}

		.content-surface,
		.section-block,
		.sidebar-card {
			border-radius: var(--radius-md);
		}

		.content-surface {
			padding-inline: var(--space-3);
			padding-bottom: var(--space-5);
		}
	}

	:global(.artist-page .tabs-wrapper.pill) {
		padding: 0 var(--space-1);
		gap: var(--space-2);
		background: transparent;
	}

	:global(.artist-page .tabs-wrapper.pill .tab) {
		flex-grow: 0;
		min-width: 96px;
		min-height: 44px;
		border-radius: 999px;
		color: var(--text-secondary);
	}

	:global(.artist-page .tabs-wrapper.pill .tab.active) {
		color: var(--text-on-primary);
	}

	:global(.artist-page .tabs-wrapper.pill .tab-border) {
		box-shadow: 0 10px 28px color-mix(in srgb, var(--primary) 32%, transparent);
	}
</style>
