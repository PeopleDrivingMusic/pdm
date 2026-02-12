<script lang="ts">
	import {
		mdiAlbum,
		mdiMusicNote,
		mdiEye,
		mdiHeart,
		mdiPlus,
		mdiPencil,
		mdiDelete,
		mdiLink
	} from '@mdi/js';
	import StatCard from '$lib/ui/StatCard.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Modal from '$lib/ui/components/Modal/Modal.svelte';
	import Input from '$lib/ui/Input.svelte';
	import FileUpload from '$lib/ui/FileUpload.svelte';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import { enhance } from '$app/forms';
	import { notificationStore } from '$lib/stores/notification.svelte';
	import Checkbox from '$lib/ui/Checkbox.svelte';

	let { data } = $props();

	// Modal states
	let showAlbumModal = $state(false);
	let showTrackModal = $state(false);
	let showLinkModal = $state(false);

	// Form states (for editing)
	let editingAlbum = $state<any>(null);
	let editingTrack = $state<any>(null);
	let linkingTrackId = $state<string>('');

	// Form data
	let albumForm = $state({
		title: '',
		description: '',
		releaseDate: '',
		genres: ''
	});

	let trackForm = $state({
		title: '',
		genres: ''
	});

	// File states
	let albumCoverFile = $state<File | null>(null);
	let trackAudioFile = $state<File | null>(null);
	let trackImageFile = $state<File | null>(null);
	let trackDuration = $state<number | null>(null);
	let durationRequestId = 0;

	async function updateTrackDuration(file: File) {
		const requestId = ++durationRequestId;
		const objectUrl = URL.createObjectURL(file);
		try {
			const duration = await new Promise<number>((resolve, reject) => {
				const audio = new Audio();
				audio.preload = 'metadata';
				audio.onloadedmetadata = () => resolve(audio.duration);
				audio.onerror = () => reject(new Error('Failed to read audio metadata'));
				audio.src = objectUrl;
			});

			if (requestId === durationRequestId) {
				trackDuration = Number.isFinite(duration) ? Math.round(duration) : null;
			}
		} catch {
			if (requestId === durationRequestId) {
				trackDuration = null;
			}
		} finally {
			URL.revokeObjectURL(objectUrl);
		}
	}

	function openCreateAlbum() {
		editingAlbum = null;
		albumForm = { title: '', description: '', releaseDate: '', genres: '' };
		albumCoverFile = null;
		showAlbumModal = true;
	}

	function openEditAlbum(album: any) {
		editingAlbum = album;
		albumForm = {
			title: album.title || '',
			description: album.description || '',
			releaseDate: album.releaseDate ? new Date(album.releaseDate).toISOString().split('T')[0] : '',
			genres: album.genres ? album.genres.join(', ') : ''
		};
		albumCoverFile = null;
		showAlbumModal = true;
	}

	function openCreateTrack() {
		editingTrack = null;
		trackForm = { title: '', genres: '' };
		trackAudioFile = null;
		trackImageFile = null;
		trackDuration = null;
		showTrackModal = true;
	}

	function openEditTrack(track: any) {
		editingTrack = track;
		trackForm = {
			title: track.title || '',
			genres: track.genre ? track.genre.join(', ') : ''
		};
		trackAudioFile = null;
		trackImageFile = null;
		trackDuration = null;
		showTrackModal = true;
	}

	function openLinkTrack(trackId: string) {
		linkingTrackId = trackId;
		showLinkModal = true;
	}

	function formatDuration(seconds?: number) {
		if (!seconds) return '--:--';
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function formatDate(date?: Date | string) {
		if (!date) return 'Not set';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Studio Music - PDM</title>
</svelte:head>

<section class="studio-page">
	<div class="page-header">
		<div>
			<h1>Music Catalog</h1>
			<p class="page-description">Manage your albums, tracks, and monitor engagement metrics</p>
		</div>
		<div class="header-actions">
			<Button variant="secondary" onClick={openCreateTrack}>
				<SvgIcon path={mdiPlus} size={18} />
				New Track
			</Button>
			<Button onClick={openCreateAlbum}>
				<SvgIcon path={mdiPlus} size={18} />
				New Album
			</Button>
		</div>
	</div>

	<!-- Stats Panel -->
	<div class="stats-grid">
		<StatCard label="Total Albums" value={data.stats.totalAlbums} icon={mdiAlbum} />
		<StatCard label="Total Tracks" value={data.stats.totalTracks} icon={mdiMusicNote} />
		<StatCard label="Total Plays" value={data.stats.totalPlays.toLocaleString()} icon={mdiEye} />
		<StatCard label="Total Likes" value={data.stats.totalLikes.toLocaleString()} icon={mdiHeart} />
	</div>

	<!-- Albums Section -->
	<div class="section">
		<div class="section-header">
			<h2>Albums ({data.albums.length})</h2>
		</div>

		{#if data.albums.length === 0}
			<div class="empty-state">
				<SvgIcon path={mdiAlbum} size={48} />
				<p>No albums yet</p>
				<Button onClick={openCreateAlbum}>Create Your First Album</Button>
			</div>
		{:else}
			<div class="albums-grid">
				{#each data.albums as album}
					<div class="album-card">
						<div class="album-cover">
							{#if album.coverImageUrl}
								<img src={album.coverImageUrl} alt={album.title} />
							{:else}
								<div class="album-cover-placeholder">
									<SvgIcon path={mdiAlbum} size={48} />
								</div>
							{/if}
							<div class="album-status" class:published={album.isPublished}>
								{album.isPublished ? 'Published' : 'Draft'}
							</div>
						</div>
						<div class="album-info">
							<h3 class="album-title">{album.title}</h3>
							{#if album.description}
								<p class="album-description">{album.description}</p>
							{/if}
							<div class="album-meta">
								{#if album.releaseDate}
								<span>{formatDate(album.releaseDate)}</span>
								{/if}
								{#if album.genres && album.genres.length > 0}
									<span class="genres">{album.genres.join(', ')}</span>
								{/if}
							</div>
						</div>
						<div class="album-actions">
							<button class="icon-btn" onclick={() => openEditAlbum(album)} title="Edit">
								<SvgIcon path={mdiPencil} size={18} />
							</button>
							<form method="POST" action="?/deleteAlbum" use:enhance>
								<input type="hidden" name="albumId" value={album.id} />
								<button
									class="icon-btn danger"
									type="submit"
									onclick={(e) => {
										if (!confirm('Delete this album? This action cannot be undone.')) {
											e.preventDefault();
										}
									}}
									title="Delete"
								>
									<SvgIcon path={mdiDelete} size={18} />
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Tracks Section -->
	<div class="section">
		<div class="section-header">
			<h2>Tracks ({data.tracks.length})</h2>
		</div>

		{#if data.tracks.length === 0}
			<div class="empty-state">
				<SvgIcon path={mdiMusicNote} size={48} />
				<p>No tracks yet</p>
				<Button onClick={openCreateTrack}>Upload Your First Track</Button>
			</div>
		{:else}
			<div class="tracks-list">
				{#each data.tracks as { track, stats }}
					<div class="track-row">
						<div class="track-info">
							<div class="track-image">
								{#if track.imageUrl}
									<img src={track.imageUrl} alt={track.title} />
								{:else}
									<div class="track-image-placeholder">
										<SvgIcon path={mdiMusicNote} size={20} />
									</div>
								{/if}
							</div>
							<div class="track-details">
								<h4 class="track-title">{track.title}</h4>
								<div class="track-meta">
									{#if track.duration}
										<span class="track-duration">{formatDuration(track.duration)}</span>
									{/if}
									{#if track.genre && track.genre.length > 0}
										<span class="track-genres">{track.genre.join(', ')}</span>
									{/if}
									<span class="track-status" class:published={track.isPublished}>
										{track.isPublished ? 'Published' : 'Draft'}
									</span>
								</div>
							</div>
						</div>
						<div class="track-stats">
							<div class="stat">
								<SvgIcon path={mdiEye} size={16} />
								<span>{stats?.playCount || 0}</span>
							</div>
							<div class="stat">
								<SvgIcon path={mdiHeart} size={16} />
								<span>{stats?.likeCount || 0}</span>
							</div>
						</div>
						<div class="track-actions">
							<button
								class="icon-btn"
								onclick={() => openLinkTrack(track.id)}
								title="Link to album"
							>
								<SvgIcon path={mdiLink} size={18} />
							</button>
							<button class="icon-btn" onclick={() => openEditTrack(track)} title="Edit">
								<SvgIcon path={mdiPencil} size={18} />
							</button>
							<form method="POST" action="?/deleteTrack" use:enhance>
								<input type="hidden" name="trackId" value={track.id} />
								<button
									class="icon-btn danger"
									type="submit"
									onclick={(e) => {
										if (!confirm('Delete this track? This action cannot be undone.')) {
											e.preventDefault();
										}
									}}
									title="Delete"
								>
									<SvgIcon path={mdiDelete} size={18} />
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>

<!-- Album Modal -->
<Modal bind:show={showAlbumModal} title={editingAlbum ? 'Edit Album' : 'Create Album'}>
	<form
		method="POST"
		action={editingAlbum ? '?/updateAlbum' : '?/createAlbum'}
		enctype="multipart/form-data"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success') {
					showAlbumModal = false;
					notificationStore.success(
						editingAlbum ? 'Album updated successfully' : 'Album created successfully'
					);
				} else if (result.type === 'failure') {
					notificationStore.error(result.data?.error || 'Failed to save album');
				}
				await update();
			};
		}}
		class="modal-form"
	>
		{#if editingAlbum}
			<input type="hidden" name="albumId" value={editingAlbum.id} />
		{/if}

		<Input
			label="Album Title"
			name="title"
			bind:value={albumForm.title}
			required
			placeholder="Enter album title"
		/>

		<div class="form-group">
			<label for="description">Description</label>
			<textarea
				id="description"
				name="description"
				bind:value={albumForm.description}
				placeholder="Enter album description"
				rows="4"
			></textarea>
		</div>

		<Input label="Release Date" name="releaseDate" type="date" bind:value={albumForm.releaseDate} />

		<Input
			label="Genres"
			name="genres"
			bind:value={albumForm.genres}
			placeholder="e.g., Rock, Pop, Jazz (comma-separated)"
		/>

		<FileUpload
			label="Cover Image"
			name="coverImage"
			accept="image/*"
			bind:value={albumCoverFile}
			maxSize={5}
			helpText="Upload album cover (max 5MB, formats: JPG, PNG, WebP)"
		/>

		{#if editingAlbum}
			<div class="form-group">
				<label>
					<input
						type="checkbox"
						name="isPublished"
						value="true"
						checked={editingAlbum.isPublished}
					/>
					Published
				</label>
			</div>
		{/if}

		<div class="modal-actions">
			<Button type="button" variant="secondary" onClick={() => (showAlbumModal = false)}>
				Cancel
			</Button>
			<Button type="submit">
				{editingAlbum ? 'Update' : 'Create'} Album
			</Button>
		</div>
	</form>
</Modal>

<!-- Track Modal -->
<Modal bind:show={showTrackModal} title={editingTrack ? 'Edit Track' : 'Create Track'}>
	<form
		method="POST"
		action={editingTrack ? '?/updateTrack' : '?/createTrack'}
		enctype="multipart/form-data"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success') {
					showTrackModal = false;
					notificationStore.success(
						editingTrack ? 'Track updated successfully' : 'Track created successfully'
					);
				} else if (result.type === 'failure') {
					notificationStore.error(result.data?.error || 'Failed to save track');
				}
				await update();
			};
		}}
		class="modal-form"
	>
		{#if editingTrack}
			<input type="hidden" name="trackId" value={editingTrack.id} />
		{/if}
		<input type="hidden" name="duration" value={trackDuration ?? ''} />

		<Input
			label="Track Title"
			name="title"
			bind:value={trackForm.title}
			placeholder="Enter track title"
		/>

		<Input
			label="Genres"
			name="genres"
			bind:value={trackForm.genres}
			placeholder="e.g., Rock, Pop, Jazz (comma-separated)"
		/>

		<FileUpload
			label="Audio File"
			name="audioFile"
			accept="audio/*"
			bind:value={trackAudioFile}
			maxSize={50}
			preview={false}
			helpText="Upload track audio (max 50MB, formats: MP3, WAV, FLAC)"
		/>

		<FileUpload
			label="Track Cover Image"
			name="trackImage"
			accept="image/*"
			bind:value={trackImageFile}
			maxSize={5}
			helpText="Upload track cover (max 5MB, formats: JPG, PNG, WebP)"
		/>

		{#if editingTrack}
			<div class="form-group">
				<Checkbox  name="isPublished" checked={editingTrack.isPublished} label="Published"></Checkbox>
				<!-- <label>
					<input
						type="checkbox"
						name="isPublished"
						value="true"
						checked={editingTrack.isPublished}
					/>
					Published
				</label> -->
			</div>
		{/if}

		<div class="modal-actions">
			<Button type="button" variant="secondary" onClick={() => (showTrackModal = false)}>
				Cancel
			</Button>
			<Button type="submit">
				{editingTrack ? 'Update' : 'Create'} Track
			</Button>
		</div>
	</form>
</Modal>

<!-- Link Track to Album Modal -->
<Modal bind:show={showLinkModal} title="Link Track to Album">
	<form
		method="POST"
		action="?/linkTrackToAlbum"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success') {
					showLinkModal = false;
					notificationStore.success('Track linked to album successfully');
				} else if (result.type === 'failure') {
					notificationStore.error(result.data?.error || 'Failed to link track to album');
				}
				await update();
			};
		}}
		class="modal-form"
	>
		<input type="hidden" name="trackId" value={linkingTrackId} />

		<div class="form-group">
			<label for="albumId">Select Album</label>
			<select id="albumId" name="albumId" required>
				<option value="">Choose an album...</option>
				{#each data.albums as album}
					<option value={album.id}>{album.title}</option>
				{/each}
			</select>
		</div>

		<Input label="Track Number" name="trackNumber" type="number" min={1} placeholder="1" required />

		<div class="modal-actions">
			<Button type="button" variant="secondary" onClick={() => (showLinkModal = false)}>
				Cancel
			</Button>
			<Button type="submit">Link Track</Button>
		</div>
	</form>
</Modal>

<style lang="scss">
	.studio-page {
		padding: var(--space-8);
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-8);
		gap: var(--space-4);

		h1 {
			margin: 0;
			font-size: var(--font-size-3xl);
			font-weight: var(--font-weight-bold);
			color: var(--text-primary);
		}

		.page-description {
			margin: var(--space-2) 0 0 0;
			color: var(--text-secondary);
			font-size: var(--font-size-sm);
		}

		.header-actions {
			display: flex;
			gap: var(--space-3);
		}
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-8);
	}

	.section {
		margin-bottom: var(--space-10);

		.section-header {
			margin-bottom: var(--space-6);

			h2 {
				margin: 0;
				font-size: var(--font-size-2xl);
				font-weight: var(--font-weight-semibold);
				color: var(--text-primary);
			}
		}
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-12) var(--space-8);
		background: var(--bg-secondary);
		border: 2px dashed var(--border-primary);
		border-radius: var(--radius-lg);
		text-align: center;
		gap: var(--space-4);

		p {
			margin: 0;
			color: var(--text-secondary);
			font-size: var(--font-size-base);
		}
	}

	.albums-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-6);
	}

	.album-card {
		background: var(--bg-surface);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: all var(--duration-normal);

		&:hover {
			transform: translateY(-4px);
			box-shadow: var(--shadow-lg);
		}

		.album-cover {
			position: relative;
			aspect-ratio: 1;
			background: var(--bg-tertiary);
			overflow: hidden;

			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}

			.album-cover-placeholder {
				width: 100%;
				height: 100%;
				display: flex;
				align-items: center;
				justify-content: center;
				color: var(--text-tertiary);
			}

			.album-status {
				position: absolute;
				top: var(--space-3);
				right: var(--space-3);
				padding: var(--space-1) var(--space-3);
				background: var(--bg-surface);
				border-radius: var(--radius-full);
				font-size: var(--font-size-xs);
				font-weight: var(--font-weight-semibold);
				color: var(--text-secondary);

				&.published {
					background: var(--color-success-500);
					color: white;
				}
			}
		}

		.album-info {
			padding: var(--space-4);

			.album-title {
				margin: 0 0 var(--space-2) 0;
				font-size: var(--font-size-lg);
				font-weight: var(--font-weight-semibold);
				color: var(--text-primary);
			}

			.album-description {
				margin: 0 0 var(--space-3) 0;
				font-size: var(--font-size-sm);
				color: var(--text-secondary);
				overflow: hidden;
				text-overflow: ellipsis;
				display: -webkit-box;
				-webkit-line-clamp: 2;
				-webkit-box-orient: vertical;
			}

			.album-meta {
				display: flex;
				gap: var(--space-2);
				font-size: var(--font-size-xs);
				color: var(--text-tertiary);
				flex-wrap: wrap;

				.genres {
					font-style: italic;
				}
			}
		}

		.album-actions {
			display: flex;
			gap: var(--space-2);
			padding: var(--space-3) var(--space-4);
			border-top: 1px solid var(--border-primary);
			background: var(--bg-secondary);
		}
	}

	.tracks-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.track-row {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--bg-surface);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-md);
		transition: all var(--duration-fast);

		&:hover {
			background: var(--bg-secondary);
			border-color: var(--border-secondary);
		}

		.track-info {
			flex: 1;
			display: flex;
			align-items: center;
			gap: var(--space-3);
			min-width: 0;

			.track-image {
				width: 48px;
				height: 48px;
				border-radius: var(--radius-sm);
				overflow: hidden;
				flex-shrink: 0;
				background: var(--bg-tertiary);

				img {
					width: 100%;
					height: 100%;
					object-fit: cover;
				}

				.track-image-placeholder {
					width: 100%;
					height: 100%;
					display: flex;
					align-items: center;
					justify-content: center;
					color: var(--text-tertiary);
				}
			}

			.track-details {
				min-width: 0;
				flex: 1;

				.track-title {
					margin: 0 0 var(--space-1) 0;
					font-size: var(--font-size-base);
					font-weight: var(--font-weight-medium);
					color: var(--text-primary);
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}

				.track-meta {
					display: flex;
					gap: var(--space-3);
					font-size: var(--font-size-xs);
					color: var(--text-tertiary);
					align-items: center;

					.track-genres {
						font-style: italic;
					}

					.track-status {
						padding: var(--space-1) var(--space-2);
						background: var(--bg-tertiary);
						border-radius: var(--radius-sm);
						font-weight: var(--font-weight-medium);

						&.published {
							background: var(--color-success-100);
							color: var(--color-success-700);
						}
					}
				}
			}
		}

		.track-stats {
			display: flex;
			gap: var(--space-4);

			.stat {
				display: flex;
				align-items: center;
				gap: var(--space-2);
				font-size: var(--font-size-sm);
				color: var(--text-secondary);
			}
		}

		.track-actions {
			display: flex;
			gap: var(--space-2);
		}
	}

	.icon-btn {
		padding: var(--space-2);
		background: transparent;
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all var(--duration-fast);
		display: flex;
		align-items: center;
		justify-content: center;

		&:hover {
			background: var(--bg-tertiary);
			border-color: var(--border-secondary);
			color: var(--text-primary);
		}

		&.danger:hover {
			background: var(--color-danger-100);
			border-color: var(--color-danger-500);
			color: var(--color-danger-700);
		}
	}

	.modal-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding-top: var(--space-6);

		.form-group {
			display: flex;
			flex-direction: column;
			gap: var(--space-2);

			label {
				font-size: var(--font-size-sm);
				font-weight: var(--font-weight-medium);
				color: var(--text-primary);
			}

			textarea,
			select {
				width: 100%;
				padding: var(--space-3) var(--space-4);
				border: 1px solid var(--border-primary);
				border-radius: var(--radius-md);
				font-size: var(--font-size-sm);
				font-family: var(--font-family-sans);
				background-color: var(--bg-surface);
				color: var(--text-primary);
				resize: vertical;

				&:focus {
					outline: none;
					border-color: var(--border-focus);
				}
			}
		}

		.modal-actions {
			display: flex;
			justify-content: flex-end;
			gap: var(--space-3);
			margin-top: var(--space-4);
		}
	}

	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;

			.header-actions {
				width: 100%;
				flex-direction: column;
			}
		}

		.albums-grid {
			grid-template-columns: 1fr;
		}

		.track-row {
			flex-wrap: wrap;

			.track-stats {
				order: 3;
				width: 100%;
				justify-content: flex-start;
			}
		}
	}
</style>
