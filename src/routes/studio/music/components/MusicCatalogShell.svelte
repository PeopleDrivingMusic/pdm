<script lang="ts">
	import { onDestroy } from 'svelte';
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { mdiPlus, mdiUpload } from '@mdi/js';
	import Button from '$lib/ui/Button.svelte';
	import SvgIcon from '$lib/ui/SvgIcon.svelte';
	import { notificationStore } from '$lib/stores/notification.svelte';
	import { extractTrackMetadata, type ClientMediaUploadTarget } from '$lib/utils/helpers';
	import { createUploadController } from '$lib/studio/music/uploadController.svelte';
	import type { TrackUploadJob } from '$lib/studio/music/types';
	import type { StudioMusicOverviewDTO, TrackDTO, AlbumDTO } from '$lib/server/music';
	import AlbumBento from './AlbumBento.svelte';
	import TrackPanel from './TrackPanel.svelte';
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
	const albumTitles = $derived(Object.fromEntries(albums.map((a) => [a.id, a.title])));
	const albumVisibility = $derived(Object.fromEntries(albums.map((a) => [a.id, a.visibility])));
	const jobsById = $derived(
		Object.fromEntries(controller.list().map((j) => [j.trackId, j])) as Record<
			string,
			TrackUploadJob
		>
	);
	const fmt = (n: number) => n.toLocaleString();

	// modal state
	let albumModalOpen = $state(false);
	let editingAlbum = $state<AlbumDTO | null>(null);
	let trackModalOpen = $state(false);
	let editingTrack = $state<TrackDTO | null>(null);
	let linkModalOpen = $state(false);
	let linkingTrackId = $state('');

	let fileInput: HTMLInputElement;

	async function submitAction(action: string, formData: FormData) {
		const res = await fetch(action, { method: 'POST', body: formData });
		const result = deserialize(await res.text());
		if (result.type === 'success') return (result.data ?? {}) as Record<string, unknown>;
		if (result.type === 'failure') {
			throw new Error((result.data as { error?: string } | undefined)?.error || 'Request failed');
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

	async function changeTrackVisibility(track: TrackDTO, v: 'public' | 'subscribers') {
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
</script>

<svelte:head><title>Music · Studio · PDM</title></svelte:head>

<section class="page">
	<!-- MASTHEAD -->
	<header class="masthead">
		<div class="lead">
			<div class="kicker">People Driving Music — Studio</div>
			<h1>Music</h1>
			<div class="sub">
				<b>{fmt(data.stats.totalTracks)}</b> tracks · <b>{fmt(data.stats.totalAlbums)}</b> albums ·
				<b>{fmt(data.stats.subscribersOnly)}</b>
				subscriber-only · <b>{fmt(data.stats.totalPlays)}</b> plays
			</div>
		</div>
		<div class="acts">
			<Button variant="secondary" onClick={openCreateAlbum}>
				<SvgIcon path={mdiPlus} size={18} /> New album
			</Button>
			<Button onClick={() => fileInput.click()}>
				<SvgIcon path={mdiUpload} size={18} /> Upload
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

	<div class="eyebrow">Albums · {albums.length}</div>
	<AlbumBento
		{albums}
		{albumTracks}
		stats={data.stats}
		onEdit={openEditAlbum}
		onDelete={deleteAlbum}
		onCreate={openCreateAlbum}
		{onFiles}
	/>

	<TrackPanel
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
		onUpload={() => fileInput.click()}
	/>
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
		max-width: 1180px;
		margin: 0 auto;
		padding: 40px 48px 90px;
		display: flex;
		flex-direction: column;
		gap: 34px;

		@media (max-width: 768px) {
			padding: 24px 18px 80px;
			gap: 24px;
		}
	}

	.masthead {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-4);
		border-bottom: 1px solid var(--border-primary);
		padding-bottom: 22px;

		.kicker {
			font-size: 12px;
			letter-spacing: 0.2em;
			text-transform: uppercase;
			color: var(--gate-tint-text);
			margin-bottom: 12px;
		}
		h1 {
			margin: 0;
			font-family: var(--font-serif);
			font-size: 58px;
			line-height: 0.95;
			font-weight: 700;
			letter-spacing: -0.01em;
			color: var(--text-primary);
		}
		.sub {
			margin-top: 12px;
			color: var(--text-tertiary);
			font-size: 14px;
			font-variant-numeric: tabular-nums;
			b {
				color: var(--text-secondary);
				font-weight: 600;
			}
		}
		.acts {
			display: flex;
			gap: 12px;
			flex-shrink: 0;
		}

		@media (max-width: 768px) {
			flex-direction: column;
			align-items: stretch;
			h1 {
				font-size: 44px;
			}
			.acts {
				margin-top: 8px;
			}
		}
	}

	.eyebrow {
		font-size: 12px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-tertiary);
		margin: 0 2px -16px;
	}
</style>
