import type { PageServerLoad, Actions } from './$types';
import { fail, error } from '@sveltejs/kit';
import {
	AlbumService,
	TrackService,
	GenreService,
	AlbumTrackService
} from '$lib/db/queries';
import { getArtistByCookie } from '$lib/server/artist-session';

export const load: PageServerLoad = async ({ parent }) => {
	const { artist } = await parent();

	if (!artist) {
		throw error(401, 'Unauthorized');
	}

	try {
		// Fetch all albums and tracks for the artist
		const [albums, tracksResult, genres] = await Promise.all([
			AlbumService.getAlbumsByArtist(artist.id),
			TrackService.getTracksByArtistForStudio(artist.id),
			GenreService.getAllGenres()
		]);

		// Calculate stats
		const stats = {
			totalAlbums: albums.length,
			totalTracks: tracksResult.length,
			publishedTracks: tracksResult.filter((t) => t.track.isPublished).length,
			draftTracks: tracksResult.filter((t) => !t.track.isPublished).length,
			totalPlays: tracksResult.reduce((acc, t) => acc + (t.stats?.playCount || 0), 0),
			totalLikes: tracksResult.reduce((acc, t) => acc + (t.stats?.likeCount || 0), 0)
		};

		return {
			albums,
			tracks: tracksResult,
			genres,
			stats
		};
	} catch (err) {
		console.error('Failed to load studio music data:', err);
		throw error(500, 'Failed to load music data');
	}
};

export const actions: Actions = {
	createAlbum: async (event) => {
		const { request } = event;
		const artist = await getArtistByCookie(event);

		if (!artist) {
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			const data = await request.formData();
			const title = data.get('title') as string;
			const description = data.get('description') as string;
			const releaseDate = data.get('releaseDate') as string;
			const genresString = data.get('genres') as string;

			if (!title) {
				return fail(400, { error: 'Title is required' });
			}

			const genres = genresString ? genresString.split(',').map((g) => g.trim()) : [];

			const album = await AlbumService.createAlbum({
				artistId: artist.id,
				title,
				description: description || null,
				releaseDate: releaseDate ? new Date(releaseDate) : null,
				genres: genres.length > 0 ? genres : null,
				isPublished: false
			});

			// Create genres if they don't exist
			if (genres.length > 0) {
				await GenreService.getOrCreateGenres(genres);
			}

			return { success: true, album };
		} catch (err) {
			console.error('Failed to create album:', err);
			return fail(500, { error: 'Failed to create album' });
		}
	},

	updateAlbum: async (event) => {
		const { request } = event;
		const artist = await getArtistByCookie(event);

		if (!artist) {
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			const data = await request.formData();
			const albumId = data.get('albumId') as string;
			const title = data.get('title') as string;
			const description = data.get('description') as string;
			const releaseDate = data.get('releaseDate') as string;
			const isPublished = data.get('isPublished') === 'true';
			const genresString = data.get('genres') as string;

			if (!albumId) {
				return fail(400, { error: 'Album ID is required' });
			}

			const genres = genresString ? genresString.split(',').map((g) => g.trim()) : [];

			const updateData: any = {};
			if (title) updateData.title = title;
			if (description !== undefined) updateData.description = description || null;
			if (releaseDate) updateData.releaseDate = new Date(releaseDate);
			if (typeof isPublished === 'boolean') updateData.isPublished = isPublished;
			if (genres.length > 0) {
				updateData.genres = genres;
				await GenreService.getOrCreateGenres(genres);
			}

			const album = await AlbumService.updateAlbum(albumId, updateData);

			if (!album) {
				return fail(404, { error: 'Album not found' });
			}

			return { success: true, album };
		} catch (err) {
			console.error('Failed to update album:', err);
			return fail(500, { error: 'Failed to update album' });
		}
	},

	deleteAlbum: async (event) => {
		const { request } = event;
		const artist = await getArtistByCookie(event);

		if (!artist) {
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			const data = await request.formData();
			const albumId = data.get('albumId') as string;

			if (!albumId) {
				return fail(400, { error: 'Album ID is required' });
			}

			const success = await AlbumService.deleteAlbum(albumId);

			if (!success) {
				return fail(500, { error: 'Failed to delete album' });
			}

			return { success: true };
		} catch (err) {
			console.error('Failed to delete album:', err);
			return fail(500, { error: 'Failed to delete album' });
		}
	},

	createTrack: async (event) => {
		const { request } = event;
		const artist = await getArtistByCookie(event);

		if (!artist) {
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			const data = await request.formData();
			const title = data.get('title') as string;
			const genresString = data.get('genres') as string;

			if (!title) {
				return fail(400, { error: 'Title is required' });
			}

			const genres = genresString ? genresString.split(',').map((g) => g.trim()) : [];

			const track = await TrackService.createTrack({
				artistId: artist.id,
				title,
				duration: null, // Will be set when audio file is uploaded
				genre: genres.length > 0 ? genres : null,
				isPublished: false,
				albumId: null
			});

			// Create genres if they don't exist
			if (genres.length > 0) {
				await GenreService.getOrCreateGenres(genres);
			}

			return { success: true, track };
		} catch (err) {
			console.error('Failed to create track:', err);
			return fail(500, { error: 'Failed to create track' });
		}
	},

	updateTrack: async (event) => {
		const { request } = event;
		const artist = await getArtistByCookie(event);

		if (!artist) {
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			const data = await request.formData();
			const trackId = data.get('trackId') as string;
			const title = data.get('title') as string;
			const isPublished = data.get('isPublished') as string;
			const genresString = data.get('genres') as string;

			if (!trackId) {
				return fail(400, { error: 'Track ID is required' });
			}

			const genres = genresString ? genresString.split(',').map((g) => g.trim()) : [];

			const updateData: any = {};
			if (title) updateData.title = title;
			if (isPublished !== null) updateData.isPublished = isPublished === 'true';
			if (genres.length > 0) {
				updateData.genre = genres;
				await GenreService.getOrCreateGenres(genres);
			}

			const track = await TrackService.updateTrack(trackId, updateData);

			if (!track) {
				return fail(404, { error: 'Track not found' });
			}

			return { success: true, track };
		} catch (err) {
			console.error('Failed to update track:', err);
			return fail(500, { error: 'Failed to update track' });
		}
	},

	deleteTrack: async (event) => {
		const { request } = event;
		const artist = await getArtistByCookie(event);

		if (!artist) {
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			const data = await request.formData();
			const trackId = data.get('trackId') as string;

			if (!trackId) {
				return fail(400, { error: 'Track ID is required' });
			}

			const success = await TrackService.deleteTrack(trackId);

			if (!success) {
				return fail(500, { error: 'Failed to delete track' });
			}

			return { success: true };
		} catch (err) {
			console.error('Failed to delete track:', err);
			return fail(500, { error: 'Failed to delete track' });
		}
	},

	linkTrackToAlbum: async (event) => {
		const { request } = event;
		const artist = await getArtistByCookie(event);

		if (!artist) {
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			const data = await request.formData();
			const albumId = data.get('albumId') as string;
			const trackId = data.get('trackId') as string;
			const trackNumber = data.get('trackNumber') as string;

			if (!albumId || !trackId) {
				return fail(400, { error: 'Album ID and Track ID are required' });
			}

			const albumTrack = await AlbumTrackService.linkTrackToAlbum(
				albumId,
				trackId,
				trackNumber ? parseInt(trackNumber) : 1
			);

			return { success: true, albumTrack };
		} catch (err) {
			console.error('Failed to link track to album:', err);
			return fail(500, { error: 'Failed to link track to album' });
		}
	},

	unlinkTrackFromAlbum: async (event) => {
		const { request } = event;
		const artist = await getArtistByCookie(event);

		if (!artist) {
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			const data = await request.formData();
			const albumId = data.get('albumId') as string;
			const trackId = data.get('trackId') as string;

			if (!albumId || !trackId) {
				return fail(400, { error: 'Album ID and Track ID are required' });
			}

			const success = await AlbumTrackService.unlinkTrackFromAlbum(albumId, trackId);

			if (!success) {
				return fail(500, { error: 'Failed to unlink track from album' });
			}

			return { success: true };
		} catch (err) {
			console.error('Failed to unlink track from album:', err);
			return fail(500, { error: 'Failed to unlink track from album' });
		}
	}
};
