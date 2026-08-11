<script lang="ts">
	import { mdiPlus, mdiCheck, mdiMusic } from '@mdi/js';
	import Modal from './Modal.svelte';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Input from '$lib/ui/Input.svelte';
	import { PlaylistClient } from '$lib/client/playlist';

	interface Playlist {
		id: string;
		name: string;
		trackCount: number;
	}

	interface Props {
		show?: boolean;
		trackId?: string;
	}

	let { show = $bindable(false), trackId = '' }: Props = $props();

	let playlists: Playlist[] = $state([]);
	let isLoadingPlaylists = $state(true);
	let searchQuery = $state('');
	let isCreatingNew = $state(false);
	let newPlaylistName = $state('');
	let isLoading = $state(false);

	const filteredPlaylists = $derived(
		playlists.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	$effect(() => {
		if (show && playlists.length === 0) {
			loadPlaylists();
		}
	});

	async function loadPlaylists(): Promise<void> {
		isLoadingPlaylists = true;
		try {
			const data = await PlaylistClient.getUserPlaylists();
			if (data) {
				playlists = data;
			}
		} finally {
			isLoadingPlaylists = false;
		}
	}

	async function handleSaveToPlaylist(playlistId: string): Promise<void> {
		if (isLoading) return;

		isLoading = true;
		try {
			const res = await PlaylistClient.addTrackToPlaylist(playlistId, trackId);
			if (res.success && res.playlist) {
				const updatedPlaylist = res.playlist;
				playlists = playlists.map((p) => (p.id === updatedPlaylist.id ? updatedPlaylist : p));
				show = false;
				resetState();
			}
		} finally {
			isLoading = false;
		}
	}

	async function handleCreatePlaylist(): Promise<void> {
		if (!newPlaylistName.trim() || isLoading) return;

		isLoading = true;
		try {
			const newPlaylist = await PlaylistClient.createPlaylist({ name: newPlaylistName });
			if (newPlaylist) {
				playlists = [newPlaylist, ...playlists];
				await PlaylistClient.addTrackToPlaylist(newPlaylist.id, trackId);
				show = false;
				resetState();
			}
		} finally {
			isLoading = false;
		}
	}

	function resetState(): void {
		searchQuery = '';
		isCreatingNew = false;
		newPlaylistName = '';
	}

	function handleModalClose(): void {
		resetState();
		show = false;
	}
</script>

<Modal
	bind:show
	backdrop={true}
	outerclose={true}
	title="Save to playlist"
	onclose={handleModalClose}
>
	<div class="save-track-modal">
		{#if !isCreatingNew}
			<div class="search-wrapper">
				<Input
					type="text"
					placeholder="Search playlists..."
					bind:value={searchQuery}
					disabled={isLoading || isLoadingPlaylists}
				/>
			</div>

			<div class="playlists-container">
				{#if isLoadingPlaylists}
					<div class="loading-state">
						<div class="spinner"></div>
						<p>Loading your playlists...</p>
					</div>
				{:else if filteredPlaylists.length}
					<div class="playlists-list">
						{#each filteredPlaylists as playlist (playlist.id)}
							<button
								class="playlist-card"
								onclick={() => handleSaveToPlaylist(playlist.id)}
								disabled={isLoading}
							>
								<div class="playlist-icon">
									<SvgIcon path={mdiMusic} size={24} />
								</div>
								<div class="playlist-content">
									<div class="playlist-name">{playlist.name}</div>
									<div class="playlist-meta">
										{playlist.trackCount}
										{playlist.trackCount === 1 ? 'track' : 'tracks'}
									</div>
								</div>
								<div class="playlist-action">
									<div class="add-button">
										<SvgIcon path={mdiPlus} size={20} />
									</div>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<div class="empty-state">
						<SvgIcon path={mdiMusic} size={48} />
						<p>No playlists found</p>
						<span>Create one to get started</span>
					</div>
				{/if}
			</div>

			<div class="create-new-wrapper">
				<button
					class="create-new-button"
					onclick={() => (isCreatingNew = true)}
					disabled={isLoading || isLoadingPlaylists}
				>
					<SvgIcon path={mdiPlus} size={20} />
					<span>Create new playlist</span>
				</button>
			</div>
		{:else}
			<div class="create-playlist-form">
				<p class="form-label">Playlist name</p>
				<Input
					type="text"
					placeholder="Enter playlist name..."
					bind:value={newPlaylistName}
					disabled={isLoading}
				/>

				<div class="form-actions">
					<Button
						variant="secondary"
						size="md"
						onClick={() => {
							isCreatingNew = false;
							newPlaylistName = '';
						}}
						disabled={isLoading}
					>
						Cancel
					</Button>
					<Button
						variant="primary"
						size="md"
						onClick={handleCreatePlaylist}
						disabled={isLoading || !newPlaylistName.trim()}
					>
						{isLoading ? 'Creating...' : 'Create & Save'}
					</Button>
				</div>
			</div>
		{/if}
	</div>
</Modal>

<style lang="scss">
	.save-track-modal {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		min-width: 420px;

		.search-wrapper {
			display: flex;
			flex-direction: column;
			gap: var(--space-2);
		}

		.playlists-container {
			min-height: 200px;
			max-height: 400px;
			overflow-y: auto;

			.loading-state {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				gap: var(--space-3);
				padding: var(--space-8);
				color: var(--text-secondary);

				.spinner {
					width: 32px;
					height: 32px;
					border: 3px solid var(--border-color);
					border-top-color: var(--primary);
					border-radius: 50%;
					animation: spin 1s linear infinite;
				}

				p {
					@include text-md();
					margin: 0;
				}
			}

			.playlists-list {
				display: flex;
				flex-direction: column;
				gap: var(--space-2);
				padding: var(--space-1);
				border-radius: var(--radius-lg);

				.playlist-card {
					display: flex;
					align-items: center;
					gap: var(--space-3);
					padding: var(--space-3) var(--space-4);
					background: var(--bg-primary);
					border: 1px solid var(--border-secondary);
					border-radius: var(--radius-md);
					cursor: pointer;

					.playlist-icon {
						display: flex;
						align-items: center;
						justify-content: center;
						width: 48px;
						height: 48px;
						background: linear-gradient(135deg, var(--primary), var(--primary-dark, #6b5d1f));
						border-radius: var(--rounded-md);
						color: white;
						flex-shrink: 0;
					}

					.playlist-content {
						flex-grow: 1;
						display: flex;
						flex-direction: column;
						gap: var(--space-1);
						text-align: left;

						.playlist-name {
							@include text-md();
							color: var(--text-primary);
							font-weight: var(--font-weight-semibold);
							white-space: nowrap;
							overflow: hidden;
							text-overflow: ellipsis;
						}

						.playlist-meta {
							@include text-sm();
							color: var(--text-secondary);
						}
					}

					.playlist-action {
						display: flex;
						align-items: center;
						justify-content: center;

						.add-button {
							width: 36px;
							height: 36px;
							display: flex;
							align-items: center;
							justify-content: center;
							background: var(--bg-surface);
							border-radius: var(--rounded-md);
							color: var(--primary);
							transition: all 200ms ease-out;
						}
					}

					&:hover:not(:disabled) {
						border-color: var(--primary);

						.add-button {
							background: var(--primary);
							color: white;
						}
					}

					&:disabled {
						opacity: 0.5;
						cursor: not-allowed;
					}
				}
			}

			.empty-state {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				gap: var(--space-3);
				padding: var(--space-8);
				color: var(--text-secondary);

				svg {
					opacity: 0.3;
				}

				p {
					@include text-lg();
					font-weight: var(--font-weight-semibold);
					margin: 0;
					color: var(--text-primary);
				}

				span {
					@include text-sm();
					margin: 0;
				}
			}
		}

		.create-new-wrapper {
			display: flex;
			padding-top: var(--space-3);
			border-top: 1px solid var(--border-color);

			.create-new-button {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: var(--space-2);
				width: 100%;
				padding: var(--space-3) var(--space-4);
				background: transparent;
				border: 1px solid var(--border-color);
				border-radius: var(--rounded-lg);
				cursor: pointer;
				color: var(--primary);
				transition: all 200ms ease-out;
				font-weight: var(--font-weight-semibold);

				&:hover:not(:disabled) {
					background: var(--primary);
					color: white;
					border-color: var(--primary);
				}

				&:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}
			}
		}

		.create-playlist-form {
			display: flex;
			flex-direction: column;
			gap: var(--space-4);

			.form-label {
				@include text-sm();
				font-weight: var(--font-weight-semibold);
				color: var(--text-secondary);
				margin: 0;
			}

			.form-actions {
				display: flex;
				gap: var(--space-3);
				justify-content: flex-end;
			}
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
