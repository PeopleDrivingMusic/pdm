import { AlbumService, TrackService, GenreService, AlbumTrackService } from '$lib/db/queries';
import type { Track, Album } from '$lib/db';
import { deleteFileFromR2 } from '$lib/db/services/R2Service';
import { eventPublisher } from '$lib/server/events';
import {
	toTrackDTO,
	toAlbumDTO,
	toTrackStatsDTO,
	coerceVisibility,
	type AlbumDTO,
	type AlbumMutationInput,
	type AlbumPatchInput,
	type StudioMusicOverviewDTO,
	type StudioStatsDTO
} from './dto';

export class MusicAccessError extends Error {
	status = 404 as const;
	constructor(message = 'Not found') {
		super(message);
		this.name = 'MusicAccessError';
	}
}

export class MusicApplicationService {
	static async assertTrackOwned(artistId: string, trackId: string): Promise<Track> {
		const track = await TrackService.getTrackById(trackId);
		if (!track || track.artistId !== artistId) {
			throw new MusicAccessError('Track not found');
		}
		return track;
	}

	static async assertAlbumOwned(artistId: string, albumId: string): Promise<Album> {
		const album = await AlbumService.getAlbumById(albumId);
		if (!album || album.artistId !== artistId) {
			throw new MusicAccessError('Album not found');
		}
		return album;
	}

	static async getStudioOverview(artistId: string): Promise<StudioMusicOverviewDTO> {
		const [albums, tracksResult, genres, albumTracks] = await Promise.all([
			AlbumService.getAlbumsByArtist(artistId),
			TrackService.getTracksByArtistForStudio(artistId),
			GenreService.getAllGenres(),
			AlbumTrackService.getAlbumTracksByArtist(artistId)
		]);

		const tracks = tracksResult.map(({ track, stats }) => ({
			track: toTrackDTO(track),
			stats: toTrackStatsDTO(stats)
		}));

		const stats: StudioStatsDTO = {
			totalAlbums: albums.length,
			totalTracks: tracks.length,
			publishedTracks: tracks.filter((t) => t.track.isPublished).length,
			draftTracks: tracks.filter((t) => !t.track.isPublished).length,
			subscribersOnly: tracks.filter((t) => t.track.visibility === 'subscribers_only').length,
			totalPlays: tracks.reduce((acc, t) => acc + (t.stats?.playCount ?? 0), 0),
			totalLikes: tracks.reduce((acc, t) => acc + (t.stats?.likeCount ?? 0), 0),
			totalSaves: tracks.reduce((acc, t) => acc + (t.stats?.saveCount ?? 0), 0)
		};

		return {
			albums: albums.map(toAlbumDTO),
			tracks,
			albumTracks: albumTracks.map(({ albumTrack }) => ({
				albumId: albumTrack.albumId,
				trackId: albumTrack.trackId,
				trackNumber: albumTrack.trackNumber
			})),
			genres: genres.map((g) => ({ id: g.id, name: g.name, displayName: g.displayName })),
			stats
		};
	}

	static async createAlbum(artistId: string, input: AlbumMutationInput): Promise<AlbumDTO> {
		const album = await AlbumService.createAlbum({
			artistId,
			title: input.title,
			description: input.description ?? null,
			releaseDate: input.releaseDate ?? null,
			genres: input.genres && input.genres.length > 0 ? input.genres : null,
			coverImageUrl: input.coverImageKey ?? null,
			isPublished: false,
			visibility: coerceVisibility(input.visibility)
		} as Parameters<typeof AlbumService.createAlbum>[0]);
		if (input.genres && input.genres.length > 0) {
			await GenreService.getOrCreateGenres(input.genres);
		}
		return toAlbumDTO(album);
	}

	static async updateAlbum(
		artistId: string,
		albumId: string,
		patch: AlbumPatchInput
	): Promise<AlbumDTO> {
		const existing = await this.assertAlbumOwned(artistId, albumId);
		const existingVisibility = coerceVisibility((existing as { visibility?: unknown }).visibility);

		const data: Record<string, unknown> = {};
		if (patch.title !== undefined) data.title = patch.title;
		if (patch.description !== undefined) data.description = patch.description ?? null;
		if (patch.releaseDate !== undefined) data.releaseDate = patch.releaseDate ?? null;
		if (patch.isPublished !== undefined) data.isPublished = patch.isPublished;
		if (patch.coverImageKey !== undefined) data.coverImageUrl = patch.coverImageKey;
		if (patch.genres && patch.genres.length > 0) {
			data.genres = patch.genres;
			await GenreService.getOrCreateGenres(patch.genres);
		}
		const nextVisibility =
			patch.visibility !== undefined ? coerceVisibility(patch.visibility) : existingVisibility;
		if (patch.visibility !== undefined) data.visibility = nextVisibility;

		const updated = await AlbumService.updateAlbum(albumId, data);
		if (!updated) throw new MusicAccessError('Album not found');

		if (nextVisibility !== existingVisibility) {
			const links = await AlbumTrackService.getAlbumTracks(albumId);
			const trackIds = links.map((l) => l.track.id);
			for (const id of trackIds) {
				await TrackService.updateTrack(id, { visibility: nextVisibility });
				await eventPublisher.publish({
					type: 'track.visibility_changed',
					trackId: id,
					artistId,
					visibility: nextVisibility,
					occurredAt: new Date().toISOString()
				});
			}
			await eventPublisher.publish({
				type: 'album.visibility_changed',
				albumId,
				artistId,
				visibility: nextVisibility,
				trackIds,
				occurredAt: new Date().toISOString()
			});
		}

		return toAlbumDTO(updated);
	}

	static async deleteAlbum(artistId: string, albumId: string): Promise<{ ok: true }> {
		const existing = await this.assertAlbumOwned(artistId, albumId);
		if (existing.coverImageUrl) {
			await deleteFileFromR2({ uniqueKey: existing.coverImageUrl, bucket: 'images' });
		}
		const ok = await AlbumService.deleteAlbum(albumId);
		if (!ok) throw new Error('Failed to delete album');
		return { ok: true };
	}
}
