<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import {
		mdiChatOutline,
		mdiHeartOutline,
		mdiImageMultipleOutline,
		mdiLockOutline,
		mdiPlayCircleOutline,
		mdiPostOutline,
		mdiVideoOutline
	} from '@mdi/js';
	import { Avatar, Button, SvgIcon, Tabs } from '$lib/ui';
	import MusicAlbum from '$lib/ui/components/MusicAlbum.svelte';
	import MusicTrack from '$lib/ui/components/MusicTrack.svelte';
	import PostMusicAttachment from '$lib/ui/components/PostMusicAttachment.svelte';
	import PostPoll from '$lib/ui/components/PostPoll.svelte';

	const { artist, tracks, albums, content } = $derived(page.data as PageData);
	const albumMap = $derived(new Map(albums.map((album) => [album.id, album])));
	const trackMap = $derived(new Map(tracks.map((track) => [track.track.id, track])));

	const tabs = [
		{ label: 'Feed', id: 'feed' },
		{ label: 'Music', id: 'music' },
		{ label: 'Posts', id: 'posts' },
		{ label: 'Photos', id: 'photos' },
		{ label: 'Videos', id: 'videos' },
		{ label: 'Shop', id: 'shop' }
	];

	let activeTab = $state(tabs[0]);

	const latestPhotos = $derived(content.photoAlbums.flatMap((album) => album.photos).slice(0, 6));
	const videoItems = $derived([...content.videoCollections, ...content.videos]);

	function formatDate(value: Date | string | null) {
		if (!value) return '';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
	}

	function contentIcon(type: string) {
		if (type === 'photo_album') return mdiImageMultipleOutline;
		if (type === 'video' || type === 'video_collection') return mdiVideoOutline;
		return mdiPostOutline;
	}

	function contentLabel(type: string) {
		if (type === 'photo_album') return 'Gallery';
		if (type === 'video_collection') return 'Video playlist';
		if (type === 'video') return 'Video';
		return 'Post';
	}
</script>

<div class="artist-page">
	<main class="main-content">
		<header class="hero">
			<div class="cover" style:background-image={artist?.coverImg ? `url('${artist.coverImg}')` : undefined}>
			</div>
			<div class="hero-content">
				<div class="identity">
					<Avatar size="lg" src={artist.avatar} name={artist.name} />
					<div>
						<p class="eyebrow">Artist</p>
						<h1>{artist?.name || 'Unknown Artist'}</h1>
						<div class="community">
							<span><strong>1.5m</strong> followers</span>
							<span><strong>100k</strong> subscribers</span>
						</div>
					</div>
				</div>
				<div class="actions">
					<Button variant="secondary">Follow</Button>
					<Button>Subscribe</Button>
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

					{#if content.feed.length}
						<div class="feed-list">
							{#each content.feed as item}
								<article class="feed-card" class:is-locked={item.isLocked}>
									<div class="feed-icon">
										<SvgIcon path={contentIcon(item.type)} size={22} />
									</div>
									<div class="feed-body">
										<div class="meta-row">
											<span>{contentLabel(item.type)}</span>
											{#if item.visibility !== 'public'}
												<span class="visibility">
													<SvgIcon path={mdiLockOutline} size={13} />
													{item.visibility}
												</span>
											{/if}
											<span>{formatDate(item.publishedAt)}</span>
										</div>
										<h3>{item.title}</h3>
										<p>{item.type === 'post' ? item.excerpt : item.description}</p>
									</div>
									{#if item.isLocked}
										<div class="lock-overlay">
											<SvgIcon path={mdiLockOutline} size={20} />
											<span>{item.lockReason}</span>
										</div>
									{/if}
								</article>
							{/each}
						</div>
					{:else}
						<div class="empty-state">No artist updates yet.</div>
					{/if}
				</section>

				<section class="section-block">
					<div class="section-heading">
						<div>
							<p class="eyebrow">Music</p>
							<h2>Top tracks</h2>
						</div>
					</div>
					<div class="track-wrapper">
						{#each tracks as track}
							<MusicTrack
								track={track.track}
								isLiked={track.isLiked}
								{artist}
								album={albumMap.get(track.track.albumId || '')}
							/>
						{/each}
					</div>
				</section>
			{:else if activeTab.id === 'music'}
				<section class="section-block">
					<div class="section-heading">
						<div>
							<p class="eyebrow">Catalog</p>
							<h2>Tracks</h2>
						</div>
					</div>
					<div class="track-wrapper">
						{#each tracks as track}
							<MusicTrack
								track={track.track}
								isLiked={track.isLiked}
								{artist}
								album={albumMap.get(track.track.albumId || '')}
							/>
						{/each}
					</div>
				</section>

				<section class="section-block">
					<div class="section-heading">
						<div>
							<p class="eyebrow">Releases</p>
							<h2>Albums</h2>
						</div>
					</div>
					<div class="album-wrapper">
						{#each albums as album}
							<MusicAlbum {album} {artist} />
						{/each}
					</div>
				</section>
			{:else if activeTab.id === 'posts'}
				<section class="section-block">
					<div class="section-heading">
						<div>
							<p class="eyebrow">Updates</p>
							<h2>Posts</h2>
						</div>
					</div>
					{#if content.posts.length}
						<div class="posts-list">
							{#each content.posts as post}
								<article class="post-card" class:is-locked={post.isLocked}>
									<header class="post-header">
										<Avatar size="md" src={artist.avatar} name={artist.name} />
										<div>
											<div class="author">{artist.name}</div>
											<div class="meta-row">
												<span>{formatDate(post.publishedAt)}</span>
												{#if post.visibility !== 'public'}
													<span class="visibility">
														<SvgIcon path={mdiLockOutline} size={13} />
														{post.visibility}
													</span>
												{/if}
											</div>
										</div>
									</header>
									<div class="post-content">
										<h3>{post.title}</h3>
										{#if post.isLocked}
											<p>{post.excerpt}</p>
											<div class="locked-panel">
												<SvgIcon path={mdiLockOutline} size={22} />
												<span>{post.lockReason}</span>
											</div>
										{:else}
											{#if post.bodyHtml}
												<div class="rich-text">{@html post.bodyHtml}</div>
											{:else}
												<p>{post.excerpt}</p>
											{/if}

											{#if post.media.length}
												<div class="post-media-grid">
													{#each post.media as media}
														<img src={media.thumbnailUrl || media.fileUrl} alt={media.alt || media.caption || post.title} loading="lazy" />
													{/each}
												</div>
											{/if}

											{#if post.musicAttachments.length}
												<div class="music-attachments">
													{#each post.musicAttachments as item}
														{@const trackEntry = item.type === 'track' ? trackMap.get(item.id) : undefined}
														<PostMusicAttachment
															attachment={item}
															{trackEntry}
															artist={artist ?? null}
															album={trackEntry?.track.albumId ? albumMap.get(trackEntry.track.albumId) : null}
														/>
													{/each}
												</div>
											{/if}

											{#if post.poll}
												<PostPoll poll={post.poll} />
											{/if}
										{/if}
									</div>
									<footer class="post-actions">
										<button aria-label="Like post"><SvgIcon path={mdiHeartOutline} size={20} /></button>
										<button aria-label="Comment on post"><SvgIcon path={mdiChatOutline} size={20} /></button>
									</footer>
								</article>
							{/each}
						</div>
					{:else}
						<div class="empty-state">No posts yet.</div>
					{/if}
				</section>
			{:else if activeTab.id === 'photos'}
				<section class="section-block">
					<div class="section-heading">
						<div>
							<p class="eyebrow">Gallery</p>
							<h2>Photo albums</h2>
						</div>
					</div>
					{#if content.photoAlbums.length}
						<div class="gallery-grid">
							{#each content.photoAlbums as album}
								<article class="gallery-card" class:is-locked={album.isLocked}>
									<div class="gallery-preview">
										{#if album.photos[0]}
											<img src={album.photos[0].thumbnailUrl || album.photos[0].fileUrl} alt={album.photos[0].alt || album.title} loading="lazy" />
										{:else}
											<SvgIcon path={album.isLocked ? mdiLockOutline : mdiImageMultipleOutline} size={34} />
										{/if}
										{#if album.isLocked}
											<div class="lock-overlay">
												<SvgIcon path={mdiLockOutline} size={20} />
												<span>{album.lockReason}</span>
											</div>
										{/if}
									</div>
									<div class="card-copy">
										<div class="meta-row">
											<span>{album.photos.length} photos</span>
											{#if album.visibility !== 'public'}
												<span class="visibility">
													<SvgIcon path={mdiLockOutline} size={13} />
													{album.visibility}
												</span>
											{/if}
										</div>
										<h3>{album.title}</h3>
										<p>{album.description}</p>
									</div>
								</article>
							{/each}
						</div>
					{:else}
						<div class="empty-state">No photo albums yet.</div>
					{/if}
				</section>
			{:else if activeTab.id === 'videos'}
				<section class="section-block">
					<div class="section-heading">
						<div>
							<p class="eyebrow">Watch</p>
							<h2>Videos and playlists</h2>
						</div>
					</div>
					{#if videoItems.length}
						<div class="video-grid">
							{#each videoItems as item}
								<article class="video-card" class:is-locked={item.isLocked}>
									<div class="video-preview">
										{#if item.type === 'video' && item.thumbnailUrl}
											<img src={item.thumbnailUrl} alt={item.title} loading="lazy" />
										{:else}
											<SvgIcon path={item.isLocked ? mdiLockOutline : mdiVideoOutline} size={36} />
										{/if}
										<div class="play-badge">
											<SvgIcon path={item.isLocked ? mdiLockOutline : mdiPlayCircleOutline} size={28} />
										</div>
									</div>
									<div class="card-copy">
										<div class="meta-row">
											<span>{contentLabel(item.type)}</span>
											{#if item.visibility !== 'public'}
												<span class="visibility">
													<SvgIcon path={mdiLockOutline} size={13} />
													{item.visibility}
												</span>
											{/if}
										</div>
										<h3>{item.title}</h3>
										<p>{item.description}</p>
										{#if item.isLocked}
											<div class="locked-inline">
												<SvgIcon path={mdiLockOutline} size={16} />
												<span>{item.lockReason}</span>
											</div>
										{/if}
									</div>
								</article>
							{/each}
						</div>
					{:else}
						<div class="empty-state">No videos yet.</div>
					{/if}
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
			{#if latestPhotos.length}
				<div class="mini-photo-grid">
					{#each latestPhotos as photo}
						<img src={photo.thumbnailUrl || photo.fileUrl} alt={photo.alt || photo.caption || 'Artist photo'} loading="lazy" />
					{/each}
				</div>
			{:else}
				<div class="empty-state compact">No public photos yet.</div>
			{/if}
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
			radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 34%),
			linear-gradient(135deg, color-mix(in srgb, var(--bg-tertiary) 92%, var(--primary)), var(--bg-primary));
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

	.community,
	.meta-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		color: var(--text-secondary);
		font-size: var(--font-size-xs);
	}

	.community strong {
		color: var(--text-primary);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-shrink: 0;
		padding-top: var(--space-5);
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

	.track-wrapper,
	.album-wrapper {
		display: grid;
		grid-auto-flow: column;
		gap: var(--space-4);
		overflow-x: auto;
		margin-inline: calc(var(--space-2) * -1);
		padding: var(--space-1) var(--space-2) var(--space-3);
		border-radius: 0;
		background: transparent;
	}

	.track-wrapper {
		grid-auto-columns: minmax(280px, 1fr);
		grid-template-rows: repeat(3, auto);
	}

	.album-wrapper {
		grid-auto-columns: minmax(180px, 220px);
	}

	.feed-list,
	.posts-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.feed-card,
	.post-card,
	.gallery-card,
	.video-card {
		position: relative;
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--border-primary) 62%, transparent);
		border-radius: var(--radius-lg);
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.035), transparent 40%),
			color-mix(in srgb, var(--bg-surface) 74%, var(--bg-primary));
		box-shadow: 0 14px 40px rgba(0, 0, 0, 0.16);
		transition:
			transform var(--duration-normal) var(--easing-ease-out),
			border-color var(--duration-normal) var(--easing-ease-out),
			background-color var(--duration-normal) var(--easing-ease-out);

		&:hover {
			transform: translateY(-2px);
			border-color: color-mix(in srgb, var(--primary) 45%, var(--border-primary));
		}
	}

	.feed-card {
		display: grid;
		grid-template-columns: 48px minmax(0, 1fr);
		gap: var(--space-3);
		padding: var(--space-4);
	}

	.feed-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--primary) 16%, var(--bg-tertiary));
		color: var(--primary);
	}

	.feed-body,
	.card-copy,
	.post-content {
		min-width: 0;

		h3 {
			margin: var(--space-1) 0;
			color: var(--text-primary);
			font-size: var(--font-size-lg);
			line-height: 1.25;
		}

		p {
			margin: 0;
			color: var(--text-secondary);
			font-size: var(--font-size-sm);
			line-height: 1.5;
		}
	}

	.visibility {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--primary);
		text-transform: capitalize;
	}

	.post-card {
		padding: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.post-header,
	.post-actions {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.author {
		color: var(--text-primary);
		font-size: var(--font-size-sm);
		font-weight: 700;
	}

	.rich-text {
		color: var(--text-primary);
		font-size: var(--font-size-sm);
		line-height: 1.6;
	}

	.post-media-grid,
	.gallery-grid,
	.video-grid {
		display: grid;
		gap: var(--space-3);
	}

	.post-media-grid {
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		margin-top: var(--space-3);

		img {
			width: 100%;
			aspect-ratio: 16 / 10;
			object-fit: cover;
			border-radius: var(--radius-md);
		}
	}

	.music-attachments {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-top: var(--space-3);
	}

	.post-actions {
		justify-content: flex-end;

		button {
			width: 44px;
			height: 44px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			border-radius: var(--radius-md);
			color: var(--text-secondary);

			&:hover {
				background: var(--bg-tertiary);
				color: var(--text-primary);
			}
		}
	}

	.gallery-grid,
	.video-grid {
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	}

	.gallery-preview,
	.video-preview {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		aspect-ratio: 16 / 10;
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--primary) 22%, transparent), transparent 54%),
			var(--bg-tertiary);
		color: var(--text-secondary);

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.card-copy {
		padding: var(--space-3);
	}

	.play-badge {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-primary);
		background: rgba(0, 0, 0, 0.18);
	}

	.lock-overlay,
	.locked-panel,
	.locked-inline {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--text-primary);
	}

	.lock-overlay {
		position: absolute;
		inset: 0;
		justify-content: center;
		padding: var(--space-4);
		background: color-mix(in srgb, var(--bg-primary) 70%, transparent);
		backdrop-filter: blur(16px);
		text-align: center;
		font-size: var(--font-size-sm);
		font-weight: 700;
	}

	.locked-panel {
		justify-content: center;
		min-height: 140px;
		margin-top: var(--space-3);
		border: 1px dashed color-mix(in srgb, var(--primary) 45%, var(--border-primary));
		border-radius: var(--radius-lg);
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--primary) 14%, transparent), transparent),
			color-mix(in srgb, var(--bg-surface) 70%, var(--bg-primary));
	}

	.locked-inline {
		margin-top: var(--space-3);
		color: var(--primary);
		font-size: var(--font-size-sm);
		font-weight: 700;
	}

	.is-locked {
		border-color: color-mix(in srgb, var(--primary) 42%, transparent);
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

	.mini-photo-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-2);
		margin-top: var(--space-3);

		img {
			width: 100%;
			aspect-ratio: 1;
			object-fit: cover;
			border-radius: var(--radius-sm);
		}
	}

	.empty-state {
		padding: var(--space-6);
		border: 1px dashed color-mix(in srgb, var(--border-primary) 58%, transparent);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--bg-surface) 46%, transparent);
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		text-align: center;

		&.compact {
			padding: var(--space-4);
		}
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
