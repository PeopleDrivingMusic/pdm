<script lang="ts">
	import type { Album, Artist, Track } from '$lib/db';
	import { Button } from '$lib/ui';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import { mdiBookmarkOutline, mdiHeartOutline, mdiChatOutline, mdiCloudDownloadOutline, mdiRocketLaunchOutline } from '@mdi/js';
	import Player from './Player.svelte';
	import Tabs from '$lib/ui/Tabs.svelte';

	interface CoverPreviewProps {
		track: Track;
		artist?: Artist;
		album?: Album;
	}

	const views = [
		{ id: 'info', label: 'Info' },
		{ id: 'facts', label: 'Facts' },
		{ id: 'comments', label: 'Comments' },
		{ id: 'posts', label: 'Posts' }
	];

	const { track, artist, album }: CoverPreviewProps = $props();
</script>

<div class="preview">
	<div
		class="track-bg"
		style="background-image: url('{track.imageUrl || album?.coverImageUrl || artist?.avatar}')"
	></div>
	<div class="info-box">
		<Tabs type="underline" showTrack={true} tabs={views} activeTab={views[0]} />
		<div class="artist-wrapper">
			<a class="track-artist" href="/artist/{artist?.slug}">{artist?.name}</a>

			<div class="buttons-wrapper">
				<Button variant="secondary" size="md">Follow</Button>
				<Button variant="primary" size="md">Subscribe</Button>
			</div>
		</div>
		<div class="info-wrapper">
			<div class="track-info-wrapper">
				<div class="album-info">
					<h3 class="album-name">{album?.title}</h3>
					<span class="album-year">{album?.releaseDate?.getFullYear()}</span>
				</div>
				<div class="track-title">{track.title}</div>
			</div>
			<div class="actions">
				
				<button class="action-button icon-button">
					<SvgIcon path={mdiHeartOutline} size={24} />
				</button>
				<button class="action-button icon-button">
					<SvgIcon path={mdiChatOutline} size={24} />
				</button><button class="action-button icon-button">
					<SvgIcon path={mdiRocketLaunchOutline} size={24} />
				</button>
				<button class="action-button icon-button">
					<SvgIcon path={mdiBookmarkOutline} size={24} />
				</button>
				<button class="action-button icon-button">
					<SvgIcon path={mdiCloudDownloadOutline} size={24} />
				</button>
			</div>
		</div>
		<div class="playerWrapper">
			<Player></Player>
		</div>
	</div>
</div>

<style lang="scss">
	.preview {
		width: 100%;
		height: 70%;
		display: flex;
		justify-content: center;
		gap: var(--space-5);

		.track-bg {
			background-position: center;
			background-size: cover;
			overflow: hidden;
			background-repeat: no-repeat;
			max-width: 50%;
			flex-shrink: 0;
			aspect-ratio: 1/1;
			border-radius: var(--radius-xl);
		}

		.info-box {
			flex-grow: 1;
			max-width: 50%;
			height: 100%;
			padding: var(--space-6);
			border-radius: var(--radius-xl);
			background-color: var(--bg-secondary);
			box-shadow: var(--shadow-lg);
			display: flex;
			flex-direction: column;
			.info-wrapper {
				display: flex;
				justify-content: space-between;
				align-items: center;
				gap: var(--space-6);
				.track-info-wrapper {
					flex-grow: 1;
					display: flex;
					flex-direction: column;
					align-items: flex-start;
					margin-top: auto;
					gap: var(--space-1);
					.track-title {
						color: var(--text-secondary);
						@include text-lg();
					}

					.album-info {
						display: flex;
						gap: var(--space-2);
						align-items: center;
						.album-name {
							color: var(--text-secondary);
						}
						.album-year {
							color: var(--text-tertiary);
						}
					}
				}

				.actions {
					display: flex;
					gap: var(--space-3);
				}
			}

			.artist-wrapper {
				display: flex;
				justify-content: space-between;
				align-items: center;
				gap: var(--space-3);
				.track-artist {
					overflow: hidden;
					text-overflow: ellipsis;
					color: var(--text-primary);
					@include text-display-md();

					&:hover {
						color: var(--primary);
						text-decoration: underline;
					}
				}
				.buttons-wrapper {
					display: flex;
					gap: var(--space-3);
				}
			}

			.playerWrapper {
				margin-top: auto;
				justify-self: flex-end;
				// flex-grow: 1;
				// display: flex;
				// width: 100%;
				// justify-content: flex-end;
				// align-items: center;
			}
		}
	}

	.icon-button {
		cursor: pointer;
		color: var(--text-tertiary);
		&:hover {
			color: var(--primary);
		}
	}
</style>
