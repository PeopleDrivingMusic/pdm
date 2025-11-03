<script lang="ts">
	import SvgIcon from './../../../lib/ui/SvgIcon.svelte';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import Button from '$lib/ui/Button.svelte';
	import Avatar from '$lib/ui/Avatar.svelte';
	import MusicTrack from '$lib/ui/components/MusicTrack.svelte';
	import {
		mdiChat,
		mdiFormatListBulleted,
		mdiListBox,
		mdiMap,
		mdiMapMarkerRadiusOutline,
		mdiHeart
	} from '@mdi/js';
	import MusicAlbum from '$lib/ui/components/MusicAlbum.svelte';
	import Progress from '$lib/ui/Progress.svelte';
	import Tabs from '$lib/ui/Tabs.svelte';
	import { derived } from 'svelte/store';
	$inspect(page.data);
	const { artist, tracks, albums } = $derived(page.data as PageData);
	const albumMap = $derived(new Map(albums.map((album) => ([album.id, album]))))
	const tabs = [
		{label: 'Feed', id: "feed"},
		{label: 'Music', id: "music"},
		{label: 'Photos', id: "photos"},
		{label: 'Posts', id: "posts"},
		{label: 'Lives', id: "lives"},
		{label: 'Shop', id: "shop"}
	];
	let tab = $state('Feed');
	const concerts = [
		{
			id: 1,
			date: '2025-03-15',
			time: '20:00',
			city: 'Los Angeles',
			country: 'USA',
			venue: 'Crypto.com Arena'
		},
		{
			id: 2,
			date: '2025-03-22',
			time: '19:30',
			city: 'New York',
			country: 'USA',
			venue: 'Madison Square Garden'
		},
		{
			id: 3,
			date: '2025-04-05',
			time: '21:00',
			city: 'London',
			country: 'UK',
			venue: 'The O2 Arena'
		},
		{
			id: 4,
			date: '2025-04-18',
			time: '20:30',
			city: 'Paris',
			country: 'France',
			venue: 'Accor Arena'
		},
		{
			id: 5,
			date: '2025-05-10',
			time: '19:00',
			city: 'Tokyo',
			country: 'Japan',
			venue: 'Tokyo Dome'
		},
		{
			id: 6,
			date: '2025-05-25',
			time: '20:00',
			city: 'Sydney',
			country: 'Australia',
			venue: 'Qudos Bank Arena'
		}
	];
	function formatDate(dateStr: string) {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<div class="artist-page">
	<div class="main-content">
		<div class="header">
			<div class="cover" style=" background-image: url('{artist?.coverImg}')"></div>
			<div class="header-content">
				<div class="info">
					<h1 class="name">{artist?.name || 'Unknown Artist'}</h1>
					<div class="community">
						<div class="followers">
							<strong>{artist.followersCount || '1.5m'}</strong> Followers
						</div>
						<div class="subscribers">
							<strong>{artist.likesCount || '100k'}</strong> Subscribers
						</div>
					</div>
					<!-- <p class="genre">{data.tracks ? data.tracks.genre : ''}</p> -->
				</div>
				<div class="actions">
					<Button variant="secondary">Follow</Button>
					<Button>Subscribe</Button>
				</div>
			</div>
		</div>
		<div class="section">
			<div class="tabs-wrapper">
				<Tabs tabs={tabs} activeTab={tabs[0]} type="pill" />
				
			</div>
			{#if tab === 'Feed'}
				<div class="feed-content">
					<h3>Top Music</h3>
					<div class="track-wrapper">
						{#each tracks as track}
							<MusicTrack track={track}  {artist} album={albumMap.get(track.albumId || "")}/>
						{/each}
					</div>
				</div>
				<div class="posts-feed">
					<h3>Recent Posts</h3>

					<!-- HTML (to paste into the posts-feed area) -->
					<div class="posts-list">
						<!-- Post 1 -->
						<article class="post">
							<div class="post-header">
								<Avatar size="md" src={artist.avatar} name={artist.name} />
								<div class="meta-row">
									<div class="author">{artist.name} <span class="time">• 2h</span></div>
									<div class="post-text">
										Just finished a new remix — dropped it in the studio today. Thoughts?
									</div>
								</div>
							</div>
							<div class="post-actions">
								<div class="action-button">
									<SvgIcon path={mdiHeart} size={24} />
								</div>
								<div class="action-button">
									<SvgIcon path={mdiChat} size={24} />
								</div>
							</div>
						</article>

						<!-- Post 2 -->
						<article class="post">
							<div class="post-header">
								<Avatar size="md" src={artist.avatar} name={artist.name} />
								<div class="meta-row">
									<div class="author">{artist.name}<span class="time">• Yesterday</span></div>
									<div class="post-text">Live session highlights — cutting a sick verse. 🎤</div>
								</div>
							</div>
							<div class="media">
								<div class="media-placeholder">LIVE SESSION CLIP</div>
							</div>
							<div class="post-actions">
								<div class="action-button">
									<SvgIcon path={mdiHeart} size={24} />
								</div>
								<div class="action-button">
									<SvgIcon path={mdiChat} size={24} />
								</div>
							</div>
						</article>

						<!-- Poll -->
						<article class="post poll">
							<div class="post-header">
								<Avatar size="md" src={artist.avatar} name={artist.name} />
								<div class="meta-row">
									<div class="author">Which track should be next?</div>
									<div class="time">• Poll · 1d</div>
								</div>
							</div>

							<form class="poll-form" on:submit|preventDefault>
								<label class="option">
									<input type="radio" name="poll" value="A" />
									<span class="option-label">Track A — Upbeat</span>
									<Progress progress={62} />
								</label>

								<label class="option">
									<input type="radio" name="poll" value="B" />
									<span class="option-label">Track B — Chill</span>
									<Progress progress={28} />
								</label>

								<label class="option">
									<input type="radio" name="poll" value="C" />
									<span class="option-label">Track C — Experimental</span>
									<Progress progress={10} />
								</label>

							</form>
						</article>
					</div>
				</div>

				<div class="albums">
					<h3>Albums</h3>
					<div class="album-wrapper">
						{#each albums as album}
							<MusicAlbum {album} {artist} />
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
	<div class="side-content">
		<div class="section">
			<div class="section-bg"></div>
			<div class="community-info">
				<h2>Community</h2>
				<div class="online">
					<div class="red-dot"></div>
					<strong>1.2k</strong> Online
				</div>
			</div>
			<div class="chat-wrapp">
				{#each Array(10) as item, index}
					<div class="message-wrapp">
						<Avatar size="s" name={`User ${index}`} />
						<div class="text">Message {index}</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="section">
			<div class="section-bg"></div>
			<div class="upcoming-header">
				<h2>Upcoming Concerts</h2>
				<div class="buttons">
					<button>
						<SvgIcon path={mdiFormatListBulleted} />
					</button>
					<button>
						<SvgIcon path={mdiMapMarkerRadiusOutline} />
					</button>
				</div>
			</div>
			<div class="concert-list">
				{#each concerts as concert}
					<div class="concert-item">
						<div class="concert-date">
							<div class="day">{formatDate(concert.date)}</div>
							<div class="time">{concert.time}</div>
						</div>
						<div class="concert-info">
							<div class="venue">{concert.venue}</div>
							<div class="location">
								<SvgIcon path={mdiMapMarkerRadiusOutline} size={16} />
								<span>{concert.city}, {concert.country}</span>
							</div>
						</div>
						<div class="button">
							<Button size="md">Get Tickets</Button>
						</div>
						<!-- <button class="get-tickets">Get Tickets</button> -->
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.artist-page {
		width: 100%;
		display: flex;
		height: max-content;

		gap: var(--space-6);
		.main-content {
			width: 60%;
			.header {
				position: relative;
				width: 100%;
				display: flex;
				flex-direction: column;
				justify-content: end;

				.cover {
					width: 100%;
					height: 100%;
					background: var(--bg-secondary);
					background-size: cover;
					background-position: top;
					z-index: 1;
					height: 350px;

					-webkit-mask-image: linear-gradient(
						to bottom,
						rgba(0, 0, 0, 1) 0%,
						rgba(0, 0, 0, 1) 22%,
						rgba(0, 0, 0, 0) 100%
					);
					mask-image: linear-gradient(
						to bottom,
						rgba(0, 0, 0, 1) 0%,
						rgba(0, 0, 0, 1) 22%,
						rgba(0, 0, 0, 0) 100%
					);
					-webkit-mask-size: 100% 100%;
					mask-size: 100% 100%;
					mask-repeat: no-repeat;

					&::after {
						content: '';
						position: absolute;
						left: 0;
						right: 0;
						bottom: 0;
						height: 40%;
						background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
						pointer-events: none;
						z-index: 1;
					}
				}
				.header-content {
					margin-top: -15%;
					z-index: 2;
					padding: var(--space-6);
					color: var(--text-primary);
					display: flex;
					justify-content: space-between;
					align-items: start;

					.info {
						display: flex;
						flex-direction: column;
						.name {
							font-size: 2.5rem;
							margin: 0;
						}
						.community {
							display: flex;
							color: var(--text-secondary);
							gap: var(--space-2);
						}
					}
					.actions {
						flex-shrink: 0;
						display: flex;
						gap: var(--space-4);
					}
				}
			}
		}

		.section {
			position: relative;
			border-radius: 12px;
			display: flex;
			display: flex;
			flex-direction: column;
			padding: var(--space-4);
			gap: var(--space-4);
			h3 {
				@include text-display-xs();
			}
		}

		.side-content {
			position: sticky;
			top: 0;
			height: max-content;
			flex-grow: 1;
			padding: var(--space-4);
			display: flex;
			flex-direction: column;
			gap: var(--space-5);
			.section {
				.community-info {
					z-index: 1;
					display: flex;
					width: 100%;
					align-items: center;
					justify-content: space-between;
					.online {
						display: flex;
						color: var(--text-secondary);
						align-items: center;
						gap: var(--space-2);
						.red-dot {
							width: 10px;
							height: 10px;
							background-color: var(--color-error-700);
							border-radius: 50%;
						}
					}
				}
				.section-bg {
					position: absolute;
					left: 0;
					right: 0;
					top: 0;
					bottom: 0;
					background-color: var(--bg-surface);
					opacity: 0.8;
					z-index: 0;
					border-radius: 12px;
				}

				h2 {
					z-index: 1;
					@include text-display-xs();
				}

				.chat-wrapp {
					flex-grow: 1;
					background: var(--bg-secondary);
					border-radius: 16px;
					z-index: 1;
					width: 100%;
					height: 300px;
					max-height: 300px;
					overflow-y: auto;
					.message-wrapp {
						padding: var(--space-2);
						display: flex;
						gap: var(--space-2);
						align-items: end;
						.text {
							@include text-xs();
							color: var(--text-primary);
							padding: var(--space-1);
							background: var(--color-brand-800);
							border-radius: var(--radius-2xl);
						}
					}
				}

				.upcoming-header {
					display: flex;
					width: 100%;
					justify-content: space-between;
					align-items: center;
					.buttons {
						display: flex;
						gap: var(--space-2);

						button:hover {
							color: var(--primary);
						}
					}
				}
			}
		}

		.tabs-wrapper {
			display: flex;
			gap: var(--space-4);
		}

		.feed-content {
			display: flex;
			flex-direction: column;
			gap: var(--space-4);

			.track-wrapper {
				background: var(--bg-secondary);
				padding: var(--space-3);
				border-radius: 12px;
				display: grid;
				grid-auto-flow: column;
				overflow-x: scroll;
				overflow-y: hidden;
				grid-auto-columns: minmax(300px, 1fr);
				grid-template-rows: repeat(3, auto);
				gap: var(--space-5);
			}
		}
		.album-wrapper {
			background: var(--bg-secondary);
			padding: var(--space-3);
			padding-block: var(--space-4);
			border-radius: 12px;
			display: grid;
			grid-auto-flow: column;
			overflow-x: scroll;
			overflow-y: hidden;
			grid-auto-columns: minmax(200px, 1fr);
			grid-template-rows: repeat(1, auto);
			gap: var(--space-5);
		}
	}

	.posts-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);

		.post {
			background: var(--bg-secondary);
			border-radius: 12px;
			padding: var(--space-3);
			display: flex;
			flex-direction: column;
			gap: var(--space-3);

			.post-header {
				display: flex;
				gap: var(--space-3);
				align-items: flex-start;

				.meta-row {
					display: flex;
					flex-direction: column;
					gap: 6px;

					.author {
						@include text-sm();
						color: var(--text-primary);
						font-weight: 600;

						.time {
							color: var(--text-secondary);
							font-weight: 400;
							margin-left: 6px;
						}
					}

					.post-text {
						@include text-xs();
						color: var(--text-primary);
					}
				}
			}

			.media {
				.media-placeholder {
					height: 140px;
					border-radius: 10px;
					background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(0, 0, 0, 0.08));
					display: flex;
					align-items: center;
					justify-content: center;
					color: var(--text-secondary);
					font-weight: 600;
				}
			}

			.post-actions {
				display: flex;
				justify-content: flex-end;
				gap: var(--space-2);
				.action-button {
					cursor: pointer;
					color: var(--text-tertiary);
					&:hover {
						color: var(--primary);
					}
				}
			}
		}

		/* Poll specific */
		.poll {
			.poll-form {
				display: flex;
				flex-direction: column;
				gap: var(--space-3);

				.option {
					display: flex;
					flex-direction: column;
					gap: 8px;
					padding: var(--space-2);
					border-radius: 10px;
					background: rgba(0, 0, 0, 0.03);
					cursor: pointer;

					input[type='radio'] {
						display: none;
					}

					.option-label {
						@include text-sm();
						color: var(--text-primary);
						font-weight: 600;
					}


					&:has(input:checked) {
						box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.06);
					}
				}

				.poll-actions {
					display: flex;
					gap: var(--space-2);
					justify-content: flex-end;
				}
			}
		}
	}

	.concert-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        z-index: 1;
        max-height: 400px;
        overflow-y: auto;

        .concert-item {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            padding: var(--space-3);
            background: rgba(255, 255, 255, 0.02);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: all 200ms ease;

            &:hover {
                background: rgba(255, 255, 255, 0.04);
                border-color: rgba(255, 255, 255, 0.1);
            }

            .concert-date {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
				width: 80px;
				aspect-ratio: 1/1;
				flex-shrink: 0;
                padding: var(--space-2);
                background: linear-gradient(
                    135deg,
                    var(--color-brand-600),
                    var(--color-brand-800)
                );
                border-radius: 10px;

                .day {
                    @include text-sm();
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .time {
                    @include text-xs();
                    color: var(--text-secondary);
                    margin-top: 2px;
                }
            }

            .concert-info {
                flex-grow: 1;
                display: flex;
                flex-direction: column;
                gap: var(--space-1);

                .venue {
                    @include text-sm();
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .location {
                    display: flex;
                    align-items: center;
                    gap: var(--space-1);
                    @include text-xs();
                    color: var(--text-secondary);
                }
            }

			.button {
				flex-shrink: 0;
				// width: 155px;
			}
        }
    }
	/* your styles go here */
</style>
