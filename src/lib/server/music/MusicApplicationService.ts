import { AlbumService, TrackService, GenreService, AlbumTrackService } from '$lib/db/queries';
import type { Track, Album } from '$lib/db';
import { deleteFileFromR2, R2_MULTIPART_PART_SIZE } from '$lib/db/services/R2Service';
import { eventPublisher } from '$lib/server/events';
import { MediaUploadService, type MediaUploadTarget } from '$lib/server/media';
import { validateAudioUpload, validateImageUpload, assertPartCount } from '../media/validation';
import {
	toTrackDTO,
	toAlbumDTO,
	toTrackStatsDTO,
	coerceVisibility,
	type AlbumDTO,
	type AlbumMutationInput,
	type AlbumPatchInput,
	type AlbumTrackDTO,
	type CreateTrackInput,
	type FinalizeTrackInput,
	type TrackPatchInput,
	type TrackUploadMetadata,
	type UploadIntent,
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

	static async createAlbumCover(artistId: string, albumId: string, intent: UploadIntent) {
		const album = await this.assertAlbumOwned(artistId, albumId);
		const check = validateImageUpload(intent);
		if (!check.ok) throw new Error(check.reason);

		if (album.coverImageUrl) {
			await deleteFileFromR2({ uniqueKey: album.coverImageUrl, bucket: 'images' });
		}
		const uploadTarget: MediaUploadTarget = await MediaUploadService.createAlbumCoverUpload({
			artistId,
			albumId,
			fileName: intent.fileName,
			contentType: intent.contentType,
			size: intent.size
		});
		const updated = await AlbumService.updateAlbum(albumId, { coverImageUrl: uploadTarget.key });
		if (!updated) throw new MusicAccessError('Album not found');
		return { album: toAlbumDTO(updated), uploadTarget };
	}

	static async replaceTrackImage(artistId: string, trackId: string, intent: UploadIntent) {
		await this.assertTrackOwned(artistId, trackId);
		const check = validateImageUpload(intent);
		if (!check.ok) throw new Error(check.reason);
		const uploadTarget = await MediaUploadService.createTrackCoverUpload({
			artistId,
			trackId,
			fileName: intent.fileName,
			contentType: intent.contentType,
			size: intent.size
		});
		const updated = await TrackService.updateTrack(trackId, { imageUrl: uploadTarget.key });
		if (!updated) throw new MusicAccessError('Track not found');
		return { track: toTrackDTO(updated), uploadTarget };
	}

	static async replaceTrackAudio(artistId: string, trackId: string, intent: UploadIntent) {
		const track = await this.assertTrackOwned(artistId, trackId);
		const check = validateAudioUpload(intent);
		if (!check.ok) throw new Error(check.reason);
		assertPartCount(intent.size, R2_MULTIPART_PART_SIZE);

		const audioUpload = await MediaUploadService.createTrackAudioUpload({
			artistId,
			trackId,
			fileName: intent.fileName,
			contentType: intent.contentType,
			size: intent.size
		});
		const uploadMetadata = this.getUploadMetadata(track.metadata);
		const updated = await TrackService.updateTrack(trackId, {
			status: 'pending_upload',
			audioUrl: audioUpload.key,
			metadata: this.mergeUploadMetadata(track.metadata, {
				...uploadMetadata,
				sourceFileName: intent.fileName,
				uploads: {
					...uploadMetadata.uploads,
					audio: MediaUploadService.toStoredTarget(audioUpload)
				}
			})
		});
		if (!updated) throw new MusicAccessError('Track not found');
		return { track: toTrackDTO(updated), uploadTargets: { audio: audioUpload, cover: null } };
	}

	private static getUploadMetadata(metadata: unknown): TrackUploadMetadata {
		const record =
			metadata && typeof metadata === 'object' && !Array.isArray(metadata)
				? (metadata as Record<string, unknown>)
				: {};
		const upload = record.upload;
		return (upload && typeof upload === 'object' ? upload : {}) as TrackUploadMetadata;
	}

	private static mergeUploadMetadata(metadata: unknown, upload: TrackUploadMetadata) {
		const base =
			metadata && typeof metadata === 'object' && !Array.isArray(metadata)
				? (metadata as Record<string, unknown>)
				: {};
		return { ...base, upload };
	}

	static async createTrack(artistId: string, input: CreateTrackInput) {
		const audioCheck = validateAudioUpload(input.audio);
		if (!audioCheck.ok) throw new Error(audioCheck.reason);
		assertPartCount(input.audio.size, R2_MULTIPART_PART_SIZE);
		if (input.cover) {
			const coverCheck = validateImageUpload(input.cover);
			if (!coverCheck.ok) throw new Error(coverCheck.reason);
		}

		const genres = input.genres && input.genres.length > 0 ? input.genres : null;
		let track = await TrackService.createTrack({
			artistId,
			title: input.title,
			genre: genres,
			status: 'pending_upload',
			audioUrl: null,
			imageUrl: null,
			duration: input.duration ?? null,
			isPublished: false,
			albumId: null,
			visibility: coerceVisibility(input.visibility)
		} as Parameters<typeof TrackService.createTrack>[0]);

		const audioUpload = await MediaUploadService.createTrackAudioUpload({
			artistId,
			trackId: track.id,
			fileName: input.audio.fileName,
			contentType: input.audio.contentType,
			size: input.audio.size
		});
		const coverUpload = input.cover
			? await MediaUploadService.createTrackCoverUpload({
					artistId,
					trackId: track.id,
					fileName: input.cover.fileName,
					contentType: input.cover.contentType,
					size: input.cover.size
				})
			: null;

		const uploadMetadata: TrackUploadMetadata = {
			sourceFileName: input.audio.fileName,
			coverFileName: input.cover?.fileName ?? null,
			uploads: {
				audio: MediaUploadService.toStoredTarget(audioUpload),
				cover: coverUpload ? MediaUploadService.toStoredTarget(coverUpload) : undefined
			}
		};

		track =
			(await TrackService.updateTrack(track.id, {
				audioUrl: audioUpload.key,
				imageUrl: coverUpload?.key ?? null,
				metadata: this.mergeUploadMetadata(track.metadata, uploadMetadata)
			})) ?? track;

		if (genres) await GenreService.getOrCreateGenres(genres);

		return { track: toTrackDTO(track), uploadTargets: { audio: audioUpload, cover: coverUpload } };
	}

	static async resumeTrackUpload(artistId: string, trackId: string) {
		const track = await this.assertTrackOwned(artistId, trackId);
		const uploadMetadata = this.getUploadMetadata(track.metadata);
		const audio = uploadMetadata.uploads?.audio;
		if (!audio) throw new Error('No pending upload exists for this track');
		return {
			track: toTrackDTO(track),
			uploadTargets: {
				audio: await MediaUploadService.renewStoredTarget(audio),
				cover: uploadMetadata.uploads?.cover
					? await MediaUploadService.renewStoredTarget(uploadMetadata.uploads.cover)
					: null
			}
		};
	}

	static async finalizeTrackUpload(artistId: string, trackId: string, input: FinalizeTrackInput) {
		const track = await this.assertTrackOwned(artistId, trackId);
		const uploadMetadata = this.getUploadMetadata(track.metadata);
		const audio = uploadMetadata.uploads?.audio;
		if (!audio) throw new Error('No audio upload metadata found');

		await MediaUploadService.completeMultipart({ upload: audio, parts: input.audioParts });

		const audioVerification = await MediaUploadService.verifyObject(audio);
		if (!audioVerification.ok) {
			await TrackService.updateTrack(trackId, {
				status: 'failed',
				metadata: this.mergeUploadMetadata(track.metadata, {
					...uploadMetadata,
					failedReason: audioVerification.reason
				})
			});
			throw new Error(audioVerification.reason);
		}

		const cover = uploadMetadata.uploads?.cover;
		if (cover && input.coverUploaded) {
			const coverVerification = await MediaUploadService.verifyObject(cover);
			if (!coverVerification.ok) {
				await TrackService.updateTrack(trackId, {
					status: 'failed',
					metadata: this.mergeUploadMetadata(track.metadata, {
						...uploadMetadata,
						failedReason: coverVerification.reason
					})
				});
				throw new Error(coverVerification.reason);
			}
		}

		const finalized =
			(await TrackService.updateTrack(trackId, {
				status: 'uploaded',
				metadata: this.mergeUploadMetadata(track.metadata, {
					...uploadMetadata,
					uploadedAt: new Date().toISOString(),
					failedReason: undefined
				})
			})) ?? track;

		await eventPublisher.publish({
			type: 'track.uploaded',
			trackId,
			artistId,
			occurredAt: new Date().toISOString()
		});

		return { track: toTrackDTO(finalized) };
	}

	static async updateTrackMetadata(artistId: string, trackId: string, patch: TrackPatchInput) {
		const existing = await this.assertTrackOwned(artistId, trackId);
		const prevVisibility = coerceVisibility((existing as { visibility?: unknown }).visibility);
		const prevPublished = !!existing.isPublished;

		const data: Record<string, unknown> = {};
		if (patch.title !== undefined) data.title = patch.title;
		if (patch.duration !== undefined) data.duration = patch.duration;
		if (patch.isPublished !== undefined) data.isPublished = patch.isPublished;
		if (patch.genres && patch.genres.length > 0) {
			data.genre = patch.genres;
			await GenreService.getOrCreateGenres(patch.genres);
		}
		const nextVisibility =
			patch.visibility !== undefined ? coerceVisibility(patch.visibility) : prevVisibility;
		if (patch.visibility !== undefined) data.visibility = nextVisibility;

		const updated = await TrackService.updateTrack(trackId, data);
		if (!updated) throw new MusicAccessError('Track not found');

		if (nextVisibility !== prevVisibility) {
			await eventPublisher.publish({
				type: 'track.visibility_changed',
				trackId,
				artistId,
				visibility: nextVisibility,
				occurredAt: new Date().toISOString()
			});
		}
		if (patch.isPublished === true && !prevPublished) {
			await eventPublisher.publish({
				type: 'track.published',
				trackId,
				artistId,
				occurredAt: new Date().toISOString()
			});
		}
		return toTrackDTO(updated);
	}

	static async deleteTrack(artistId: string, trackId: string): Promise<{ ok: true }> {
		await this.assertTrackOwned(artistId, trackId);
		const ok = await TrackService.deleteTrack(trackId);
		if (!ok) throw new Error('Failed to delete track');
		await eventPublisher.publish({
			type: 'track.deleted',
			trackId,
			artistId,
			occurredAt: new Date().toISOString()
		});
		return { ok: true };
	}

	static async linkTrackToAlbum(
		artistId: string,
		albumId: string,
		trackId: string,
		trackNumber: number
	): Promise<AlbumTrackDTO> {
		const album = await this.assertAlbumOwned(artistId, albumId);
		const track = await this.assertTrackOwned(artistId, trackId);
		const albumVisibility = coerceVisibility((album as { visibility?: unknown }).visibility);
		const trackVisibility = coerceVisibility((track as { visibility?: unknown }).visibility);

		const link = await AlbumTrackService.linkTrackToAlbum(albumId, trackId, trackNumber);

		if (albumVisibility !== trackVisibility) {
			await TrackService.updateTrack(trackId, { visibility: albumVisibility });
			await eventPublisher.publish({
				type: 'track.visibility_changed',
				trackId,
				artistId,
				visibility: albumVisibility,
				occurredAt: new Date().toISOString()
			});
		}

		return { albumId: link.albumId, trackId: link.trackId, trackNumber: link.trackNumber };
	}

	static async unlinkTrackFromAlbum(
		artistId: string,
		albumId: string,
		trackId: string
	): Promise<{ ok: true }> {
		await this.assertAlbumOwned(artistId, albumId);
		await this.assertTrackOwned(artistId, trackId);
		const ok = await AlbumTrackService.unlinkTrackFromAlbum(albumId, trackId);
		if (!ok) throw new Error('Failed to unlink track from album');
		return { ok: true };
	}
}
