<script lang="ts">
	interface TrackOption {
		id: string;
		title: string;
		imageUrl: string | null;
		isPublished: boolean | null;
	}

	interface AlbumOption {
		id: string;
		title: string;
		coverImageUrl: string | null;
		isPublished: boolean | null;
	}

	interface Props {
		tracks: TrackOption[];
		albums: AlbumOption[];
		selectedTrackIds?: string[];
		selectedAlbumIds?: string[];
	}

	let { tracks, albums, selectedTrackIds = [], selectedAlbumIds = [] }: Props = $props();
</script>

<section class="music-picker">
	<div class="columns">
		<div>
			<h3>Tracks</h3>
			<div class="options">
				{#each tracks as track}
					<label class="option">
						<input
							type="checkbox"
							name="trackIds"
							value={track.id}
							checked={selectedTrackIds.includes(track.id)}
						/>
						<span class="cover">
							{#if track.imageUrl}
								<img src={track.imageUrl} alt="" loading="lazy" />
							{:else}
								<span aria-hidden="true">{track.title.slice(0, 1)}</span>
							{/if}
						</span>
						<span class="copy">
							<span>{track.title}</span>
							<small>{track.isPublished ? 'Published' : 'Draft'}</small>
						</span>
					</label>
				{/each}
				{#if tracks.length === 0}
					<p class="empty">No tracks yet.</p>
				{/if}
			</div>
		</div>

		<div>
			<h3>Albums</h3>
			<div class="options">
				{#each albums as album}
					<label class="option">
						<input
							type="checkbox"
							name="albumIds"
							value={album.id}
							checked={selectedAlbumIds.includes(album.id)}
						/>
						<span class="cover">
							{#if album.coverImageUrl}
								<img src={album.coverImageUrl} alt="" loading="lazy" />
							{:else}
								<span aria-hidden="true">{album.title.slice(0, 1)}</span>
							{/if}
						</span>
						<span class="copy">
							<span>{album.title}</span>
							<small>{album.isPublished ? 'Published' : 'Draft'}</small>
						</span>
					</label>
				{/each}
				{#if albums.length === 0}
					<p class="empty">No albums yet.</p>
				{/if}
			</div>
		</div>
	</div>
</section>

<style lang="scss">
	.music-picker {
		display: block;
	}

	.columns {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-4);

		h3 {
			margin: 0 0 var(--space-2);
			color: var(--text-primary);
			font-size: var(--font-size-xs);
			text-transform: uppercase;
		}
	}

	.options {
		display: grid;
		gap: var(--space-2);
	}

	.option {
		display: grid;
		grid-template-columns: auto 40px minmax(0, 1fr);
		align-items: center;
		gap: var(--space-2);
		min-height: 52px;
		padding: var(--space-2);
		border: 1px solid var(--border-primary);
		border-radius: var(--radius-md);
		background: transparent;
		cursor: pointer;

		input {
			width: 18px;
			height: 18px;
			accent-color: var(--primary);
		}
	}

	.cover {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: var(--radius-sm);
		background: var(--bg-tertiary);
		color: var(--text-tertiary);
		font-weight: var(--font-weight-semibold);

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.copy {
		min-width: 0;
		display: grid;

		span {
			color: var(--text-primary);
			font-size: var(--font-size-sm);
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}

		small {
			color: var(--text-tertiary);
			font-size: var(--font-size-xs);
		}
	}

	.empty {
		margin: 0;
		color: var(--text-tertiary);
		font-size: var(--font-size-sm);
	}

	@media (max-width: 700px) {
		.columns {
			grid-template-columns: 1fr;
		}
	}
</style>
