<script lang="ts">
	import { onDestroy } from 'svelte';
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { mdiPlus, mdiUpload } from '@mdi/js';
	import Button from '$lib/ui/Button.svelte';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import UploadDropzone from '$lib/ui/UploadDropzone.svelte';
	import { notificationStore } from '$lib/stores/notification.svelte';
	import { extractTrackMetadata, type ClientMediaUploadTarget } from '$lib/utils/helpers';
	import { createUploadController } from '$lib/studio/music/uploadController.svelte';
	import type { TrackUploadJob } from '$lib/studio/music/types';
	import type { StudioMusicOverviewDTO, TrackDTO, AlbumDTO } from '$lib/server/music';
	import MusicStatsBar from './MusicStatsBar.svelte';
	import AlbumGrid from './AlbumGrid.svelte';
	import TrackList from './TrackList.svelte';
	import UploadDock from './UploadDock.svelte';
	import AlbumFormModal from './AlbumFormModal.svelte';
	import TrackFormModal from './TrackFormModal.svelte';
	import LinkTrackModal from './LinkTrackModal.svelte';

	let { data }: { data: StudioMusicOverviewDTO } = $props();

	const controller = createUploadController();
	onDestroy(() => controller.destroy());

	const albums = $derived(data.albums);
	const tracks = $derived(data.tracks);
	const albumTracks = $derived(data.albumTracks);
	const trackTitles = $derived(
		Object.fromEntries(tracks.map(({ track }) => [track.id, track.title]))
	);
	const albumTitles = $derived(Object.fromEntries(albums.map((a) => [a.id, a.title])));
	const albumVisibility = $derived(Object.fromEntries(albums.map((a) => [a.id, a.visibility])));
	const jobsById = $derived(
		Object.fromEntries(controller.list().map((j) => [j.trackId, j])) as Record<
			string,
			TrackUploadJob
		>
	);

	type Tab = 'all' | 'albums' | 'tracks';
	let tab = $state<Tab>('all');

	// modal state
	let albumModalOpen = $state(false);
	let editingAlbum = $state<AlbumDTO | null>(null);
	let trackModalOpen = $state(false);
	let editingTrack = $state<TrackDTO | null>(null);
	let linkModalOpen = $state(false);
	let linkingTrackId = $state('');

	async function submitAction(action: string, formData: FormData) {
		const res = await fetch(action, { method: 'POST', body: formData });
		const result = deserialize(await res.text());
		if (result.type === 'success') return (result.data ?? {}) as Record<string, unknown>;
		if (result.type === 'failure') {
			const err = (result.data as { error?: string } | undefined)?.error;
			throw new Error(err || 'Request failed');
		}
		throw new Error('Request failed');
	}

	async function onFiles(files: File[]) {
		for (const audioFile of files) {
			try {
				const meta = await extractTrackMetadata(audioFile);
				const coverFile = meta.coverImageFile;
				const fd = new FormData();
				fd.set('title', meta.title ?? audioFile.name);
				fd.set('visibility', 'public');
				fd.set('metadata', JSON.stringify({ duration: meta.duration, title: meta.title }));
				fd.set('type', audioFile.type);
				fd.set('file_name', audioFile.name);
				fd.set('file_size', String(audioFile.size));
				if (coverFile) {
					fd.set('cover_type', coverFile.type);
					fd.set('cover_title', coverFile.name);
					fd.set('cover_size', String(coverFile.size));
				}
				const result = await submitAction('?/createTrack', fd);
				const track = result.track as { id: string } | undefined;
				const uploadTargets = result.uploadTargets as {
					audio: ClientMediaUploadTarget;
					cover: ClientMediaUploadTarget | null;
				};
				if (track?.id && uploadTargets?.audio) {
					controller.enqueue({
						trackId: track.id,
						title: meta.title ?? audioFile.name,
						audioFile,
						coverFile,
						uploadTargets
					});
				}
			} catch (e) {
				notificationStore.error(e instanceof Error ? e.message : 'Could not start upload');
			}
		}
		await invalidateAll();
	}

	async function changeTrackVisibility(track: TrackDTO, v: 'public' | 'subscribers_only') {
		try {
			const fd = new FormData();
			fd.set('trackId', track.id);
			fd.set('visibility', v);
			fd.set('title', track.title);
			await submitAction('?/updateTrack', fd);
			await invalidateAll();
		} catch (e) {
			notificationStore.error(e instanceof Error ? e.message : 'Could not update visibility');
		}
	}

	async function deleteTrack(track: TrackDTO) {
		if (!confirm(`Delete “${track.title}”? This cannot be undone.`)) return;
		try {
			const fd = new FormData();
			fd.set('trackId', track.id);
			await submitAction('?/deleteTrack', fd);
			notificationStore.success('Track deleted');
			await invalidateAll();
		} catch (e) {
			notificationStore.error(e instanceof Error ? e.message : 'Could not delete track');
		}
	}

	async function deleteAlbum(album: AlbumDTO) {
		if (!confirm(`Delete album “${album.title}”? This cannot be undone.`)) return;
		try {
			const fd = new FormData();
			fd.set('albumId', album.id);
			await submitAction('?/deleteAlbum', fd);
			notificationStore.success('Album deleted');
			await invalidateAll();
		} catch (e) {
			notificationStore.error(e instanceof Error ? e.message : 'Could not delete album');
		}
	}

	async function unlinkTrack(albumId: string, trackId: string) {
		try {
			const fd = new FormData();
			fd.set('albumId', albumId);
			fd.set('trackId', trackId);
			await submitAction('?/unlinkTrackFromAlbum', fd);
			await invalidateAll();
		} catch (e) {
			notificationStore.error(e instanceof Error ? e.message : 'Could not unlink track');
		}
	}

	function openCreateAlbum() {
		editingAlbum = null;
		albumModalOpen = true;
	}
	function openEditAlbum(album: AlbumDTO) {
		editingAlbum = album;
		albumModalOpen = true;
	}
	function openEditTrack(track: TrackDTO) {
		editingTrack = track;
		trackModalOpen = true;
	}
	function openLink(track: TrackDTO) {
		linkingTrackId = track.id;
		linkModalOpen = true;
	}

	let fileInput: HTMLInputElement;
	function pickFiles() {
		fileInput?.click();
	}
</script>

<svelte:head><title>Music · Studio · PDM</title></svelte:head>

<section class="page">
	<header class="page-head">
		<div>
			<h1>Music</h1>
			<p class="sub">Manage your albums and tracks, and control who can listen.</p>
		</div>
		<div class="head-actions">
			<Button variant="secondary" onClick={pickFiles}>
				<SvgIcon path={mdiUpload} size={18} /> Upload tracks
			</Button>
			<Button onClick={openCreateAlbum}>
				<SvgIcon path={mdiPlus} size={18} /> New album
			</Button>
			<input
				bind:this={fileInput}
				type="file"
				accept="audio/*"
				multiple
				hidden
				onchange={(e) => {
					const list = (e.currentTarget as HTMLInputElement).files;
					if (list) onFiles(Array.from(list));
					(e.currentTarget as HTMLInputElement).value = '';
				}}
			/>
		</div>
	</header>

	<MusicStatsBar stats={data.stats} />

	<div class="dropzone-wrap">
		<UploadDropzone accept="audio/*" maxSizeMb={100} {onFiles} />
	</div>

	<nav class="tabs" aria-label="Catalog view">
		{#each [['all', 'All'], ['albums', 'Albums'], ['tracks', 'Tracks']] as [id, label] (id)}
			<button
				type="button"
				role="tab"
				aria-selected={tab === id}
				class:active={tab === id}
				onclick={() => (tab = id as Tab)}
			>
				{label}
			</button>
		{/each}
	</nav>

	{#if tab === 'all' || tab === 'albums'}
		<div class="section">
			<h2>Albums <span class="muted">({albums.length})</span></h2>
			<AlbumGrid
				{albums}
				{albumTracks}
				{trackTitles}
				onEdit={openEditAlbum}
				onDelete={deleteAlbum}
				onUnlinkTrack={unlinkTrack}
				onCreate={openCreateAlbum}
			/>
		</div>
	{/if}

	{#if tab === 'all' || tab === 'tracks'}
		<div class="section">
			<h2>Tracks <span class="muted">({tracks.length})</span></h2>
			<TrackList
				{tracks}
				{albumTracks}
				{albumTitles}
				{albumVisibility}
				{jobsById}
				onEdit={openEditTrack}
				onDelete={deleteTrack}
				onLink={openLink}
				onVisibilityChange={changeTrackVisibility}
				onRetry={(id) => controller.retryTrackUpload(id)}
				onUpload={pickFiles}
			/>
		</div>
	{/if}
</section>

<UploadDock
	jobs={controller.list()}
	onRetry={(id) => controller.retryTrackUpload(id)}
	onDismiss={(id) => controller.dismiss(id)}
/>

<AlbumFormModal bind:open={albumModalOpen} album={editingAlbum} />
<TrackFormModal bind:open={trackModalOpen} track={editingTrack} />
<LinkTrackModal bind:open={linkModalOpen} trackId={linkingTrackId} {albums} />

<style lang="scss">
	.page {
		padding: var(--space-8);
		max-width: 1400px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-6);

		@media (max-width: 768px) {
			padding: var(--space-4);
			gap: var(--space-4);
		}
	}

	.page-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-4);

		h1 {
			margin: 0;
			font-size: var(--font-size-3xl);
			font-weight: var(--font-weight-bold);
			color: var(--text-primary);
		}
		.sub {
			margin: var(--space-1) 0 0;
			color: var(--text-secondary);
			font-size: var(--font-size-sm);
		}
		.head-actions {
			display: flex;
			gap: var(--space-3);
			flex-shrink: 0;
		}

		@media (max-width: 768px) {
			flex-direction: column;
			.head-actions {
				width: 100%;
			}
		}
	}

	.dropzone-wrap {
		max-width: 640px;
	}

	.tabs {
		display: flex;
		gap: var(--space-1);
		border-bottom: 1px solid var(--border-primary);

		button {
			border: 0;
			background: transparent;
			padding: var(--space-3) var(--space-4);
			color: var(--text-secondary);
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			cursor: pointer;
			border-bottom: 2px solid transparent;
			margin-bottom: -1px;
			transition:
				color var(--duration-fast),
				border-color var(--duration-fast);

			&:hover {
				color: var(--text-primary);
			}
			&.active {
				color: var(--color-brand-400);
				border-bottom-color: var(--color-brand-400);
			}
			&:focus-visible {
				outline: 2px solid var(--border-focus);
				outline-offset: -2px;
			}
		}
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);

		h2 {
			margin: 0;
			font-size: var(--font-size-xl);
			font-weight: var(--font-weight-semibold);
			color: var(--text-primary);
			.muted {
				color: var(--text-tertiary);
				font-weight: var(--font-weight-normal);
			}
		}
	}
</style>
