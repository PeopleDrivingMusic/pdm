import type { Track, Album, TrackStats } from '$lib/db';
import type { Visibility } from '$lib/server/events';
import type { StoredUploadTarget } from '$lib/server/media';

export type TrackUploadStatus =
	| 'draft'
	| 'pending_upload'
	| 'processing'
	| 'uploaded'
	| 'ready'
	| 'failed';

export interface TrackDTO {
	id: string;
	artistId: string;
	albumId: string | null;
	title: string;
	duration: number | null;
	audioKey: string | null;
	imageKey: string | null;
	genres: string[];
	status: TrackUploadStatus;
	visibility: Visibility;
	isPublished: boolean;
	trackNumber: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface AlbumDTO {
	id: string;
	artistId: string;
	title: string;
	description: string | null;
	coverImageKey: string | null;
	releaseDate: string | null;
	genres: string[];
	visibility: Visibility;
	isPublished: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface TrackStatsDTO {
	playCount: number;
	likeCount: number;
	saveCount: number;
}

export interface GenreDTO {
	id: string;
	name: string;
	displayName: string;
}

export interface AlbumTrackDTO {
	albumId: string;
	trackId: string;
	trackNumber: number;
}

export interface StudioStatsDTO {
	totalAlbums: number;
	totalTracks: number;
	publishedTracks: number;
	draftTracks: number;
	subscribersOnly: number;
	totalPlays: number;
	totalLikes: number;
	totalSaves: number;
}

export interface StudioMusicOverviewDTO {
	albums: AlbumDTO[];
	tracks: { track: TrackDTO; stats: TrackStatsDTO | null }[];
	albumTracks: AlbumTrackDTO[];
	genres: GenreDTO[];
	stats: StudioStatsDTO;
}

export type UploadIntent = { fileName: string; contentType: string; size: number };

export interface AlbumMutationInput {
	title: string;
	description?: string | null;
	releaseDate?: Date | null;
	genres?: string[];
	visibility?: Visibility;
	coverImageKey?: string | null;
}

export interface AlbumPatchInput {
	title?: string;
	description?: string | null;
	releaseDate?: Date | null;
	genres?: string[];
	visibility?: Visibility;
	isPublished?: boolean;
	coverImageKey?: string | null;
}

export interface CreateTrackInput {
	title: string;
	genres?: string[];
	visibility?: Visibility;
	duration?: number | null;
	audio: UploadIntent;
	cover?: UploadIntent | null;
}

export interface FinalizeTrackInput {
	audioParts: Array<{ partNumber: number; etag: string }>;
	coverUploaded: boolean;
}

export interface TrackPatchInput {
	title?: string;
	genres?: string[];
	visibility?: Visibility;
	isPublished?: boolean;
	duration?: number | null;
}

export interface TrackUploadMetadata {
	sourceFileName?: string;
	coverFileName?: string | null;
	uploads?: { audio?: StoredUploadTarget; cover?: StoredUploadTarget };
	uploadedAt?: string;
	failedReason?: string;
}

export function coerceVisibility(value: unknown): Visibility {
	return value === 'subscribers_only' ? 'subscribers_only' : 'public';
}

export function toTrackDTO(track: Track): TrackDTO {
	return {
		id: track.id,
		artistId: track.artistId,
		albumId: track.albumId ?? null,
		title: track.title,
		duration: track.duration ?? null,
		audioKey: track.audioUrl ?? null,
		imageKey: track.imageUrl ?? null,
		genres: track.genre ?? [],
		status: track.status as TrackUploadStatus,
		visibility: coerceVisibility((track as { visibility?: unknown }).visibility),
		isPublished: !!track.isPublished,
		trackNumber: track.trackNumber ?? null,
		createdAt: track.createdAt.toISOString(),
		updatedAt: track.updatedAt.toISOString()
	};
}

export function toAlbumDTO(album: Album): AlbumDTO {
	return {
		id: album.id,
		artistId: album.artistId,
		title: album.title,
		description: album.description ?? null,
		coverImageKey: album.coverImageUrl ?? null,
		releaseDate: album.releaseDate ? album.releaseDate.toISOString() : null,
		genres: album.genres ?? [],
		visibility: coerceVisibility((album as { visibility?: unknown }).visibility),
		isPublished: !!album.isPublished,
		createdAt: album.createdAt.toISOString(),
		updatedAt: album.updatedAt.toISOString()
	};
}

export function toTrackStatsDTO(stats: TrackStats | null): TrackStatsDTO | null {
	if (!stats) return null;
	return {
		playCount: stats.playCount ?? 0,
		likeCount: stats.likeCount ?? 0,
		saveCount: stats.saveCount ?? 0
	};
}
