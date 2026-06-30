import { AlbumService, TrackService, GenreService, AlbumTrackService } from '$lib/db/queries';
import type { Track, Album } from '$lib/db';
import {
	toTrackDTO,
	toAlbumDTO,
	toTrackStatsDTO,
	coerceVisibility,
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
}
