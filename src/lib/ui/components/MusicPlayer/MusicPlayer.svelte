<script>
	import {
		mdiHeart,
		mdiArrowCollapse,
		mdiClose,
		mdiBookmarkOutline,
		mdiChatOutline,
		mdiRocketLaunchOutline,
		mdiCloudDownloadOutline,
		mdiHeartOutline
	} from '@mdi/js';
	import SvgIcon from '../../SvgIcon.svelte';
	import Button from '../../Button.svelte';
	import { playerStore } from '$lib/stores/player.svelte';
	import { fade, fly } from 'svelte/transition';
	import Player from './Player.svelte';
	import Avatar from '$lib/ui/Avatar.svelte';
	import Tabs from '$lib/ui/Tabs.svelte';
	import CoverPreview from './CoverPreview.svelte';

	const { track, artist, album } = $derived(playerStore.que[playerStore.currentTrackIndex]);
	const socialTabs = [
		{ id: 'lyrics', label: 'Lyrics' },
		{ id: 'comments', label: 'Comments' },
		{ id: 'facts', label: 'Facts' },
		{ id: 'posts', label: 'Posts' }
	];

	const playerModeTabs = [
		{ id: 'info', label: 'Info' },
		{ id: 'lyric', label: 'Lyric' },
		{ id: 'clip', label: 'Clip' },
		{ id: 'live', label: 'Live' },
		{ id: 'game', label: 'Game' }
	];

	const musicModeTabs = [
		{ id: 'next', label: 'Next' },
		{ id: 'recommendations', label: 'Recommendations' },
		{ id: 'similar', label: 'Similar' },
		{ id: 'covers', label: 'Cover versions' }
	];
	let isExpanded = $state(true);
</script>

<div class="player-wrapper" class:expanded={isExpanded} in:fly={{ y: 100 }}>
	<div class="left-column">
		{#if isExpanded}
			<div class="tracks-next">
				<div class="tabs-wrapper">
					<Tabs
						type="underline"
						tabs={musicModeTabs}
						showTrack={true}
						activeTab={musicModeTabs[0]}
						onTabChange={(tab) => console.log('Tab changed to:', tab)}
					/>
				</div>
				<div class="tracks-que">
					{#each playerStore.que as { track, artist }, index}
						<div class="track">
							<Avatar
								size="s"
								square={true}
								src={track.imageUrl || album?.coverImageUrl || artist?.avatar}
							/>
							<div class="track-info">
								<h3 class="track-title">{track.title}</h3>
								<a class="track-artist" href="/artist/{artist?.slug}">{artist?.name}</a>
							</div>
							<div class="actions">
								<div class="button">
									<SvgIcon path={mdiHeart} size={20} />
								</div>
								<div class="button">
									<SvgIcon path={mdiClose} size={20} />
								</div>
							</div>
						</div>
						<!-- content here -->
					{/each}
				</div>
			</div>
		{:else}
			<div class="track-info">
				<div class="artist-info">
					<div class="track-title">{track.title}</div>
					<a class="track-artist" href="/artist/{artist?.slug}">{artist?.name}</a>
				</div>
				<div class="button-wrapper">
					<Button variant="primary" size="md">Subscribe</Button>
				</div>
			</div>
		{/if}
	</div>
	<div class="center-column">
		{#if isExpanded}
			<button class="collapse-button icon-button" onclick={() => (isExpanded = false)}>
				<SvgIcon path={mdiArrowCollapse} size={20} />
			</button>
			<div class="preview-wrapper" in:fade>
				<div class="buttons-wrapper">
					<Tabs
						type="pill"
						tabs={playerModeTabs}
						activeTab={playerModeTabs[0]}
						onTabChange={(tab) => console.log('Tab changed to:', tab)}
					/>
				</div>
				<CoverPreview {track} {artist} {album} />
			</div>
		{/if}
		{#if !isExpanded}
			<Player />
		{/if}
	</div>
	{#if !isExpanded}
		<!-- content here -->

		<div class="right-column">
			<div class="actions">
				{#if !isExpanded}
					<button class="action-button icon-button">
						<SvgIcon path={mdiHeartOutline} size={20} />
					</button>
					<button class="action-button icon-button">
						<SvgIcon path={mdiChatOutline} size={20} />
					</button><button class="action-button icon-button">
						<SvgIcon path={mdiRocketLaunchOutline} size={20} />
					</button>
					<button class="action-button icon-button">
						<SvgIcon path={mdiBookmarkOutline} size={20} />
					</button>
					<button class="action-button icon-button">
						<SvgIcon path={mdiCloudDownloadOutline} size={20} />
					</button>
				{:else}
					<Tabs
						type="underline"
						showTrack={true}
						tabs={socialTabs}
						activeTab={socialTabs[0]}
						onTabChange={(tab) => console.log('Tab changed to:', tab)}
					/>
				{/if}
				<button
					class="action-button expand-button icon-button"
					onclick={() => (isExpanded = !isExpanded)}
				>
					<SvgIcon path={mdiArrowCollapse} size={20} />
				</button>
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	.player-wrapper {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--bg-surface);
		box-shadow: 0 0 2px 2px rgba(0, 0, 0, 0.1);
		display: flex;
		align-items: center;
		padding-inline: var(--space-6);
		padding-block: var(--space-3);
		gap: var(--space-8);
		z-index: 1000;
		justify-content: space-between;
		overflow: hidden;
		height: 76px;
		transition:
			height 300ms ease-out,
			background 300ms ease-out;

		.left-column {
			display: flex;
			height: 100%;
			flex-direction: column;
			justify-content: start;
			transition: background 300ms ease-out;
		}
		.center-column {
			display: flex;
			flex-grow: 1;
			height: 100%;
			flex-direction: column;
			justify-content: end;
			gap: var(--space-4);
			transition: background 300ms ease-out;

			.preview-wrapper {
				flex-grow: 1;
				width: 100%;
				min-height: 0;
				height: 100%;
				display: flex;
				flex-direction: column;
				gap: var(--space-4);
				.buttons-wrapper {
					width: 524px;
					display: flex;
					gap: var(--space-3);
				}
			}
		}

		.track-info {
			display: flex;
			flex-shrink: 0;
			gap: var(--space-5);
			align-items: center;
			.button-wrapper {
				flex-shrink: 1;
			}
			.artist-info {
				display: flex;
				flex-shrink: 0;
				flex-direction: column;

				.track-title {
					@include text-md();
					color: var(--text-primary);
				}

				.track-artist {
					@include text-sm();
					color: var(--text-secondary);

					&:hover {
						color: var(--primary);
						text-decoration: underline;
					}
				}
			}
		}

		.actions {
			display: flex;
			justify-content: flex-end;
			gap: var(--space-2);
			.action-button {
				&.expand-button {
					margin-left: var(--space-10);
				}
			}
			&.expanded {
				max-height: 100vh;
			}
		}

		.icon-button {
			cursor: pointer;
			color: var(--text-tertiary);
			&:hover {
				color: var(--primary);
			}
		}

		&.expanded {
			height: 100vh;
			background: var(--bg-primary);
			padding: 0;
			gap: 0;

			.left-column {
				box-shadow: inset -1px 0 0 0 rgba(0, 0, 0, 0.1);
				background: var(--bg-surface);
				gap: var(--space-3);
				max-width: 20%;
				.track-info {
					padding: var(--space-6);
					padding-bottom: 0;
				}
				.tabs-wrapper {
					padding: var(--space-6);
				}
				.tracks-next {
					display: flex;
					flex-direction: column;
					gap: var(--space-3);
					flex-grow: 1;
					height: 100%;
					min-height: 0;
					overflow: hidden;
				}
				.tracks-que {
					display: flex;
					flex-direction: column;
					flex-grow: 1;
					overflow: auto;

					.track {
						display: flex;
						justify-content: space-between;
						align-items: center;
						gap: var(--space-2);
						padding: var(--space-2) var(--space-6);

						.track-info {
							display: flex;
							cursor: pointer;
							padding: 0;
							flex-direction: column;
							align-items: flex-start;
							gap: 0;
							flex-grow: 1;
							.track-title {
								color: var(--text-primary);
								@include text-sm();
							}

							.track-artist {
								color: var(--text-secondary);
								@include text-xs();

								&:hover {
									color: var(--primary);
									text-decoration: underline;
								}
							}
						}
						.actions {
							display: none;
						}
						&:hover {
							background: var(--bg-primary);
							.actions {
								display: flex;
								color: var(--text-tertiary);

								.button:hover {
									cursor: pointer;
									color: var(--primary);
								}
							}
						}
					}
				}
			}

			.center-column {
				flex-grow: 1;
				padding: var(--space-6);
				// padding-bottom: var(--space-3);
				.preview-wrapper {
					display: flex;
					align-items: center;
					height: 100%;
					justify-content: flex-start;
				}
			}

			.right-column {
				height: 100%;
				padding: var(--space-6);
				box-shadow: inset -1px 0 0 0 rgba(0, 0, 0, 0.1);
				background: var(--bg-surface);
				gap: var(--space-3);
				width: 20%;
				display: flex;
				flex-direction: column;

				.actions {
					justify-content: flex-end;

					.expand-button {
						margin-left: 0;
					}
				}
			}
		}
	}
</style>
