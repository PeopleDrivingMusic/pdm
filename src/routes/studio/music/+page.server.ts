import type { PageServerLoad, Actions } from './$types';
import { fail, error } from '@sveltejs/kit';
import {
	AlbumService,
	TrackService,
	GenreService,
	AlbumTrackService
} from '$lib/db/queries';
import { getArtistByCookie } from '$lib/server/artist-session';
import { uploadImage, uploadAudio, deleteFile } from '$lib/server/upload';
import { extractTrackMetadata } from '$lib/server/music-metadata';

function getUploadRelativePath(urlOrPath: string | null | undefined) {
	if (!urlOrPath) return null;
	if (urlOrPath.startsWith('/uploads/')) {
		return urlOrPath.slice('/uploads/'.length);
	}
	if (urlOrPath.startsWith('uploads/')) {
		return urlOrPath.slice('uploads/'.length);
	}
	return urlOrPath;
}

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
			const coverImageFile = data.get('coverImage') as File | null;

			if (!title) {
				return fail(400, { error: 'Title is required' });
			}

			const genres = genresString ? genresString.split(',').map((g) => g.trim()) : [];

			// Upload cover image if provided
			let coverImageUrl: string | null = null;
			if (coverImageFile && coverImageFile.size > 0) {
				const uploadResult = await uploadImage(coverImageFile, 'albums');
				if (uploadResult.success) {
					coverImageUrl = uploadResult.url!;
				} else {
					return fail(400, { error: uploadResult.error || 'Failed to upload cover image' });
				}
			}

			const album = await AlbumService.createAlbum({
				artistId: artist.id,
				title,
				description: description || null,
				releaseDate: releaseDate ? new Date(releaseDate) : null,
				genres: genres.length > 0 ? genres : null,
				coverImageUrl,
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
			const coverImageFile = data.get('coverImage') as File | null;

			if (!albumId) {
				return fail(400, { error: 'Album ID is required' });
			}

			const existingAlbum = await AlbumService.getAlbumById(albumId);
			if (!existingAlbum) {
				return fail(404, { error: 'Album not found' });
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

			// Upload new cover image if provided
			let previousCoverPath: string | null = null;
			if (coverImageFile && coverImageFile.size > 0) {
				const uploadResult = await uploadImage(coverImageFile, 'albums');
				if (uploadResult.success) {
					updateData.coverImageUrl = uploadResult.url!;
					previousCoverPath = getUploadRelativePath(existingAlbum.coverImageUrl);
				} else {
					return fail(400, { error: uploadResult.error || 'Failed to upload cover image' });
				}
			}

			const album = await AlbumService.updateAlbum(albumId, updateData);
			if (album && previousCoverPath && previousCoverPath !== getUploadRelativePath(album.coverImageUrl)) {
				deleteFile(previousCoverPath);
			}

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

			const existingAlbum = await AlbumService.getAlbumById(albumId);
			if (!existingAlbum) {
				return fail(404, { error: 'Album not found' });
			}

			const previousCoverPath = getUploadRelativePath(existingAlbum.coverImageUrl);
			const success = await AlbumService.deleteAlbum(albumId);

			if (!success) {
				return fail(500, { error: 'Failed to delete album' });
			}

			if (previousCoverPath) {
				deleteFile(previousCoverPath);
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
			const audioFile = data.get('audioFile') as File | null;
			const trackImageFile = data.get('trackImage') as File | null;

			const trackMetadata = audioFile && audioFile.size > 0
				? await extractTrackMetadata(audioFile)
				: null;
			const resolvedTitle = title?.trim() || trackMetadata?.title || '';

			if (!resolvedTitle) {
				return fail(400, { error: 'Title is required' });
			}

			const genres = genresString ? genresString.split(',').map((g) => g.trim()) : [];

			// Upload audio file if provided
			let audioUrl: string | null = null;
			let duration: number | null = trackMetadata?.duration ?? null;
			if (audioFile && audioFile.size > 0) {
				const uploadResult = await uploadAudio(audioFile, 'tracks');
				if (uploadResult.success) {
					audioUrl = uploadResult.url!;
				} else {
					return fail(400, { error: uploadResult.error || 'Failed to upload audio file' });
				}
			}

			// Upload track image if provided
			let imageUrl: string | null = null;
			if (trackImageFile && trackImageFile.size > 0) {
				const uploadResult = await uploadImage(trackImageFile, 'tracks');
				if (uploadResult.success) {
					imageUrl = uploadResult.url!;
				} else {
					return fail(400, { error: uploadResult.error || 'Failed to upload track image' });
				}
			} else if (trackMetadata?.coverImageFile) {
				const uploadResult = await uploadImage(trackMetadata.coverImageFile, 'tracks');
				if (uploadResult.success) {
					imageUrl = uploadResult.url!;
				} else {
					return fail(400, { error: uploadResult.error || 'Failed to upload track image' });
				}
			}

			const track = await TrackService.createTrack({
				artistId: artist.id,
				title: resolvedTitle,
				genre: genres.length > 0 ? genres : null,
				audioUrl,
				imageUrl,
				duration,
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
			const audioFile = data.get('audioFile') as File | null;
			const trackImageFile = data.get('trackImage') as File | null;
			const durationValue = data.get('duration') as string | null;

			if (!trackId) {
				return fail(400, { error: 'Track ID is required' });
			}

			const existingTrack = await TrackService.getTrackById(trackId);
			if (!existingTrack) {
				return fail(404, { error: 'Track not found' });
			}

			const trackMetadata = audioFile && audioFile.size > 0
				? await extractTrackMetadata(audioFile)
				: null;

			const genres = genresString ? genresString.split(',').map((g) => g.trim()) : [];

			const updateData: any = {};
			if (title) {
				updateData.title = title;
			} else if (trackMetadata?.title) {
				updateData.title = trackMetadata.title;
			}
			if (isPublished !== null) updateData.isPublished = isPublished === 'true';
			if (durationValue && durationValue.trim() !== '') {
				const parsedDuration = Number(durationValue);
				if (Number.isFinite(parsedDuration)) {
					updateData.duration = Math.round(parsedDuration);
				}
			} else if (trackMetadata?.duration) {
				updateData.duration = trackMetadata.duration;
			}
			if (genres.length > 0) {
				updateData.genre = genres;
				await GenreService.getOrCreateGenres(genres);
			}

			let previousAudioPath: string | null = null;
			if (audioFile && audioFile.size > 0) {
				const uploadResult = await uploadAudio(audioFile, 'tracks');
				if (uploadResult.success) {
					updateData.audioUrl = uploadResult.url!;
					previousAudioPath = getUploadRelativePath(existingTrack.audioUrl);
					if (durationValue && durationValue.trim() !== '') {
						const parsedDuration = Number(durationValue);
						if (Number.isFinite(parsedDuration)) {
							updateData.duration = Math.round(parsedDuration);
						}
					}
				} else {
					return fail(400, { error: uploadResult.error || 'Failed to upload audio file' });
				}
			}

			let previousImagePath: string | null = null;
			if (trackImageFile && trackImageFile.size > 0) {
				const uploadResult = await uploadImage(trackImageFile, 'tracks');
				if (uploadResult.success) {
					updateData.imageUrl = uploadResult.url!;
					previousImagePath = getUploadRelativePath(existingTrack.imageUrl);
				} else {
					return fail(400, { error: uploadResult.error || 'Failed to upload track image' });
				}
			} else if (trackMetadata?.coverImageFile) {
				const uploadResult = await uploadImage(trackMetadata.coverImageFile, 'tracks');
				if (uploadResult.success) {
					updateData.imageUrl = uploadResult.url!;
					previousImagePath = getUploadRelativePath(existingTrack.imageUrl);
				} else {
					return fail(400, { error: uploadResult.error || 'Failed to upload track image' });
				}
			}

			const track = await TrackService.updateTrack(trackId, updateData);
			if (track) {
				if (previousAudioPath && previousAudioPath !== getUploadRelativePath(track.audioUrl)) {
					deleteFile(previousAudioPath);
				}
				if (previousImagePath && previousImagePath !== getUploadRelativePath(track.imageUrl)) {
					deleteFile(previousImagePath);
				}
			}

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

			const existingTrack = await TrackService.getTrackById(trackId);
			if (!existingTrack) {
				return fail(404, { error: 'Track not found' });
			}

			const previousAudioPath = getUploadRelativePath(existingTrack.audioUrl);
			const previousImagePath = getUploadRelativePath(existingTrack.imageUrl);
			const success = await TrackService.deleteTrack(trackId);

			if (!success) {
				return fail(500, { error: 'Failed to delete track' });
			}

			if (previousAudioPath) {
				deleteFile(previousAudioPath);
			}
			if (previousImagePath) {
				deleteFile(previousImagePath);
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
