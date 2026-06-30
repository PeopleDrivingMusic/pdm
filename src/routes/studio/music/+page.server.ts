import type { PageServerLoad, Actions } from './$types';
import { fail, error } from '@sveltejs/kit';
import { AlbumService, TrackService, GenreService, AlbumTrackService } from '$lib/db/queries';
import { getArtistByCookie } from '$lib/server/artist-session';
import {
	uploadImage,
	uploadAudio,
	deleteFile,
	buildSourceAudioFileName,
	buildCoverFileName
} from '$lib/server/upload';
import { extractTrackMetadata, type TrackMetadata } from '$lib/server/music-metadata';
import { MediaUploadService, type StoredUploadTarget } from '$lib/server/media';

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

function normalizeUploadUrl(pathOrUrl: string | null | undefined) {
	if (!pathOrUrl) return null;
	if (/^(https?:|data:|blob:)/i.test(pathOrUrl)) return pathOrUrl;
	if (pathOrUrl.startsWith('/uploads/')) return pathOrUrl;
	if (pathOrUrl.startsWith('uploads/')) return `/${pathOrUrl}`;
	return pathOrUrl;
}

function normalizeGenres(genresString: string | null | undefined) {
	return (genresString ?? '')
		.split(',')
		.map((genre) => genre.trim().toLowerCase())
		.filter(Boolean);
}

function isOwnedByArtist(record: { artistId: string } | null | undefined, artistId: string) {
	return !!record && record.artistId === artistId;
}

type TrackUploadMetadata = {
	sourceFileName?: string;
	coverFileName?: string | null;
	uploads?: {
		audio?: StoredUploadTarget;
		cover?: StoredUploadTarget;
	};
	uploadedAt?: string;
	failedReason?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function getUploadMetadata(metadata: unknown): TrackUploadMetadata {
	const record = asRecord(metadata);
	const uploadRecord = asRecord(record.upload);
	return uploadRecord as TrackUploadMetadata;
}

function mergeUploadMetadata(metadata: unknown, upload: TrackUploadMetadata) {
	return {
		...asRecord(metadata),
		upload
	};
}

function getPositiveNumber(value: FormDataEntryValue | null) {
	if (typeof value !== 'string') return 0;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseUploadParts(value: FormDataEntryValue | null) {
	if (typeof value !== 'string' || !value.trim()) return [];
	try {
		const parts = JSON.parse(value);
		if (!Array.isArray(parts)) return [];
		return parts
			.map((part) => ({
				partNumber: Number(part.partNumber),
				etag: typeof part.etag === 'string' ? part.etag : ''
			}))
			.filter((part) => Number.isInteger(part.partNumber) && part.partNumber > 0 && part.etag);
	} catch {
		return [];
	}
}

export const load: PageServerLoad = async ({ parent }) => {
	const { artist } = await parent();

	if (!artist) {
		throw error(401, 'Unauthorized');
	}

	try {
		// Fetch all albums and tracks for the artist
		const [albums, tracksResult, genres, albumTracks] = await Promise.all([
			AlbumService.getAlbumsByArtist(artist.id),
			TrackService.getTracksByArtistForStudio(artist.id),
			GenreService.getAllGenres(),
			AlbumTrackService.getAlbumTracksByArtist(artist.id)
		]);

		const studioAlbums = albums.map((album) => ({
			...album,
			coverImageUrl: normalizeUploadUrl(album.coverImageUrl)
		}));
		const studioTracks = tracksResult.map(({ track, stats }) => ({
			track: {
				...track,
				audioUrl: normalizeUploadUrl(track.audioUrl),
				imageUrl: normalizeUploadUrl(track.imageUrl)
			},
			stats
		}));

		// Calculate stats
		const stats = {
			totalAlbums: studioAlbums.length,
			totalTracks: tracksResult.length,
			publishedTracks: tracksResult.filter((t) => t.track.isPublished).length,
			draftTracks: tracksResult.filter((t) => !t.track.isPublished).length,
			totalPlays: tracksResult.reduce((acc, t) => acc + (t.stats?.playCount || 0), 0),
			totalLikes: tracksResult.reduce((acc, t) => acc + (t.stats?.likeCount || 0), 0),
			totalSaves: tracksResult.reduce((acc, t) => acc + (t.stats?.saveCount || 0), 0)
		};

		return {
			albums: studioAlbums,
			tracks: studioTracks,
			albumTracks,
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

			const genres = normalizeGenres(genresString);

			let album = await AlbumService.createAlbum({
				artistId: artist.id,
				title,
				description: description || null,
				releaseDate: releaseDate ? new Date(releaseDate) : null,
				genres: genres.length > 0 ? genres : null,
				coverImageUrl: null,
				isPublished: false
			});

			if (coverImageFile && coverImageFile.size > 0) {
				const uploadResult = await uploadImage(
					coverImageFile,
					`covers/albums/${artist.id}`,
					buildCoverFileName(album.id, coverImageFile)
				);
				if (uploadResult.success) {
					album =
						(await AlbumService.updateAlbum(album.id, { coverImageUrl: uploadResult.path })) ??
						album;
				} else {
					await AlbumService.deleteAlbum(album.id);
					return fail(400, { error: uploadResult.error || 'Failed to upload cover image' });
				}
			}

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
			if (!isOwnedByArtist(existingAlbum, artist.id)) {
				return fail(404, { error: 'Album not found' });
			}

			const genres = normalizeGenres(genresString);

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
				const uploadResult = await uploadImage(
					coverImageFile,
					`covers/albums/${artist.id}`,
					buildCoverFileName(albumId, coverImageFile)
				);
				if (uploadResult.success) {
					updateData.coverImageUrl = uploadResult.path!;
					previousCoverPath = getUploadRelativePath(existingAlbum.coverImageUrl);
				} else {
					return fail(400, { error: uploadResult.error || 'Failed to upload cover image' });
				}
			}

			const album = await AlbumService.updateAlbum(albumId, updateData);
			if (
				album &&
				previousCoverPath &&
				previousCoverPath !== getUploadRelativePath(album.coverImageUrl)
			) {
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
			if (!isOwnedByArtist(existingAlbum, artist.id)) {
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
			const trackMetadataJSON = data.get('metadata') as string | null;
			const file_name = data.get('file_name') as string;
			const file_type = data.get('type') as string;
			const file_size = getPositiveNumber(data.get('file_size'));
			const cover_type = data.get('cover_type') as string | null;
			const cover_title = data.get('cover_title') as string | null;
			const cover_size = getPositiveNumber(data.get('cover_size'));
			const trackMetadata: TrackMetadata | null = trackMetadataJSON ? JSON.parse(trackMetadataJSON) : null;
			const resolvedTitle = title?.trim() || trackMetadata?.title || '';

			if (!resolvedTitle) {
				return fail(400, { error: 'Title is required' });
			}
			if (!file_name || !file_type || file_size <= 0) {
				return fail(400, { error: 'Audio file metadata is required' });
			}

			const genres = normalizeGenres(genresString);
			let duration: number | null = trackMetadata?.duration ?? null;

			let track = await TrackService.createTrack({
				artistId: artist.id,
				title: resolvedTitle,
				genre: genres.length > 0 ? genres : null,
				status: 'pending_upload',
				audioUrl: null,
				imageUrl: null,
				duration,
				isPublished: false,
				albumId: null
			});

			const audioUpload = await MediaUploadService.createTrackAudioUpload({
				artistId: artist.id,
				trackId: track.id,
				fileName: file_name,
				contentType: file_type,
				size: file_size
			});
			const coverUpload =
				cover_title && cover_type && cover_size > 0
					? await MediaUploadService.createTrackCoverUpload({
							artistId: artist.id,
							trackId: track.id,
							fileName: cover_title,
							contentType: cover_type,
							size: cover_size
						})
					: null;

			const uploadMetadata: TrackUploadMetadata = {
				sourceFileName: file_name,
				coverFileName: cover_title,
				uploads: {
					audio: MediaUploadService.toStoredTarget(audioUpload),
					cover: coverUpload ? MediaUploadService.toStoredTarget(coverUpload) : undefined
				}
			};

			track =
				(await TrackService.updateTrack(track.id, {
					audioUrl: audioUpload.key,
					imageUrl: coverUpload?.key ?? null,
					metadata: mergeUploadMetadata(track.metadata, uploadMetadata)
				})) ?? track;

			// Create genres if they don't exist
			if (genres.length > 0) {
				await GenreService.getOrCreateGenres(genres);
			}

			return {
				success: true,
				track,
				uploadTargets: {
					audio: audioUpload,
					cover: coverUpload
				}
			};
		} catch (err) {
			console.error('Failed to create track:', err);
			return fail(500, { error: 'Failed to create track' });
		}
	},

	resumeTrackUpload: async (event) => {
		const { request } = event;
		const artist = await getArtistByCookie(event);

		if (!artist) {
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			const data = await request.formData();
			const trackId = data.get('trackId') as string;
			if (!trackId) return fail(400, { error: 'Track ID is required' });

			const track = await TrackService.getTrackById(trackId);
			if (!track || track.artistId !== artist.id) {
				return fail(404, { error: 'Track not found' });
			}

			const uploadMetadata = getUploadMetadata(track.metadata);
			const audio = uploadMetadata.uploads?.audio;
			if (!audio) {
				return fail(400, { error: 'No pending upload exists for this track' });
			}

			return {
				success: true,
				track,
				uploadTargets: {
					audio: await MediaUploadService.renewStoredTarget(audio),
					cover: uploadMetadata.uploads?.cover
						? await MediaUploadService.renewStoredTarget(uploadMetadata.uploads.cover)
						: null
				}
			};
		} catch (err) {
			console.error('Failed to resume track upload:', err);
			return fail(500, { error: 'Failed to resume upload' });
		}
	},

	finalizeTrackUpload: async (event) => {
		const { request } = event;
		const artist = await getArtistByCookie(event);

		if (!artist) {
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			const data = await request.formData();
			const trackId = data.get('trackId') as string;
			if (!trackId) return fail(400, { error: 'Track ID is required' });

			const track = await TrackService.getTrackById(trackId);
			if (!track || track.artistId !== artist.id) {
				return fail(404, { error: 'Track not found' });
			}

			const uploadMetadata = getUploadMetadata(track.metadata);
			const audio = uploadMetadata.uploads?.audio;
			if (!audio) {
				return fail(400, { error: 'No audio upload metadata found' });
			}

			await MediaUploadService.completeMultipart({
				upload: audio,
				parts: parseUploadParts(data.get('audioParts'))
			});

			const audioVerification = await MediaUploadService.verifyObject(audio);
			if (!audioVerification.ok) {
				await TrackService.updateTrack(trackId, {
					status: 'failed',
					metadata: mergeUploadMetadata(track.metadata, {
						...uploadMetadata,
						failedReason: audioVerification.reason
					})
				});
				return fail(400, { error: audioVerification.reason });
			}

			const cover = uploadMetadata.uploads?.cover;
			if (cover && data.get('coverUploaded') === 'true') {
				const coverVerification = await MediaUploadService.verifyObject(cover);
				if (!coverVerification.ok) {
					await TrackService.updateTrack(trackId, {
						status: 'failed',
						metadata: mergeUploadMetadata(track.metadata, {
							...uploadMetadata,
							failedReason: coverVerification.reason
						})
					});
					return fail(400, { error: coverVerification.reason });
				}
			}

			const finalizedMetadata: TrackUploadMetadata = {
				...uploadMetadata,
				uploadedAt: new Date().toISOString(),
				failedReason: undefined
			};
			const finalizedTrack = await TrackService.updateTrack(trackId, {
				status: 'uploaded',
				metadata: mergeUploadMetadata(track.metadata, finalizedMetadata)
			});

			return { success: true, track: finalizedTrack };
		} catch (err) {
			console.error('Failed to finalize track upload:', err);
			return fail(500, { error: 'Failed to finalize upload' });
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
			if (!existingTrack || existingTrack.artistId !== artist.id) {
				return fail(404, { error: 'Track not found' });
			}

			const trackMetadata =
				audioFile && audioFile.size > 0 ? await extractTrackMetadata(audioFile) : null;

			const genres = normalizeGenres(genresString);

			const updateData: any = {};
			if (title) {
				updateData.title = title;
			} else if (trackMetadata?.title) {
				updateData.title = trackMetadata.title;
			}
			if (isPublished !== null)
				updateData.isPublished = isPublished === 'true' || isPublished === 'on';
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
				const uploadResult = await uploadAudio(
					audioFile,
					`audio/${artist.id}/${trackId}`,
					buildSourceAudioFileName(audioFile)
				);
				if (uploadResult.success) {
					updateData.audioUrl = uploadResult.path!;
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
				const uploadResult = await uploadImage(
					trackImageFile,
					`covers/tracks/${artist.id}`,
					buildCoverFileName(trackId, trackImageFile)
				);
				if (uploadResult.success) {
					updateData.imageUrl = uploadResult.path!;
					previousImagePath = getUploadRelativePath(existingTrack.imageUrl);
				} else {
					return fail(400, { error: uploadResult.error || 'Failed to upload track image' });
				}
			} else if (trackMetadata?.coverImageFile) {
				const uploadResult = await uploadImage(
					trackMetadata.coverImageFile,
					`covers/tracks/${artist.id}`,
					buildCoverFileName(trackId, trackMetadata.coverImageFile)
				);
				if (uploadResult.success) {
					updateData.imageUrl = uploadResult.path!;
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
			if (!existingTrack || existingTrack.artistId !== artist.id) {
				return fail(404, { error: 'Track not found' });
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

			const [album, track] = await Promise.all([
				AlbumService.getAlbumById(albumId),
				TrackService.getTrackById(trackId)
			]);
			if (!isOwnedByArtist(album, artist.id) || !isOwnedByArtist(track, artist.id)) {
				return fail(404, { error: 'Album or track not found' });
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

			const [album, track] = await Promise.all([
				AlbumService.getAlbumById(albumId),
				TrackService.getTrackById(trackId)
			]);
			if (!isOwnedByArtist(album, artist.id) || !isOwnedByArtist(track, artist.id)) {
				return fail(404, { error: 'Album or track not found' });
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
