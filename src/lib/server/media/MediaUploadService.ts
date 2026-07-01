import {
	completeMultipartUpload,
	createMultipartUpload,
	createPresignedPutUrl,
	headR2Object,
	signMultipartParts,
	type BucketName,
	type R2UploadTarget
} from '$lib/db/services/R2Service';

export type MediaUploadKind = 'track-audio' | 'track-cover' | 'album-cover' | 'content-photo';

export interface MediaUploadTarget {
	kind: MediaUploadKind;
	bucket: BucketName;
	key: string;
	contentType: string;
	size: number;
	target: R2UploadTarget;
}

export interface StoredUploadTarget {
	kind: MediaUploadKind;
	bucket: BucketName;
	key: string;
	contentType: string;
	size: number;
	mode: 'single' | 'multipart';
	uploadId?: string;
	partSize?: number;
	partCount?: number;
}

const MULTIPART_THRESHOLD_BYTES = 8 * 1024 * 1024;

function getExtension(fileName: string, fallback: string) {
	const match = fileName.toLowerCase().match(/\.[a-z0-9]+$/);
	return match?.[0] ?? fallback;
}

function sanitizeSegment(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 96);
}

function trackAudioKey(input: { artistId: string; trackId: string; fileName: string }) {
	return `${input.artistId}/tracks/${input.trackId}/source${getExtension(input.fileName, '.mp3')}`;
}

function trackCoverKey(input: { artistId: string; trackId: string; fileName: string }) {
	return `${input.artistId}/tracks/${input.trackId}/cover${getExtension(input.fileName, '.jpg')}`;
}

function albumCoverKey(input: { artistId: string; albumId: string; fileName: string }) {
	return `${input.artistId}/albums/${input.albumId}/cover${getExtension(input.fileName, '.jpg')}`;
}

function contentPhotoKey(input: { artistId: string; fileName: string }) {
	const name = sanitizeSegment(input.fileName) || `photo-${Date.now()}.jpg`;
	return `${input.artistId}/content/photos/${Date.now()}-${name}`;
}

async function createTarget(input: {
	kind: MediaUploadKind;
	bucket: BucketName;
	key: string;
	contentType: string;
	size: number;
	allowMultipart?: boolean;
}): Promise<MediaUploadTarget> {
	const target =
		input.allowMultipart && input.size > MULTIPART_THRESHOLD_BYTES
			? await createMultipartUpload({
					bucket: input.bucket,
					key: input.key,
					contentType: input.contentType,
					size: input.size
				})
			: await createPresignedPutUrl({
					bucket: input.bucket,
					key: input.key,
					contentType: input.contentType
				});

	return {
		kind: input.kind,
		bucket: input.bucket,
		key: input.key,
		contentType: input.contentType,
		size: input.size,
		target
	};
}

export class MediaUploadService {
	static async createTrackAudioUpload(input: {
		artistId: string;
		trackId: string;
		fileName: string;
		contentType: string;
		size: number;
	}) {
		return createTarget({
			kind: 'track-audio',
			bucket: 'music',
			key: trackAudioKey(input),
			contentType: input.contentType || 'audio/mpeg',
			size: input.size,
			allowMultipart: true
		});
	}

	static async createTrackCoverUpload(input: {
		artistId: string;
		trackId: string;
		fileName: string;
		contentType: string;
		size: number;
	}) {
		return createTarget({
			kind: 'track-cover',
			bucket: 'images',
			key: trackCoverKey(input),
			contentType: input.contentType || 'image/jpeg',
			size: input.size,
			allowMultipart: false
		});
	}

	static async createAlbumCoverUpload(input: {
		artistId: string;
		albumId: string;
		fileName: string;
		contentType: string;
		size: number;
	}) {
		return createTarget({
			kind: 'album-cover',
			bucket: 'images',
			key: albumCoverKey(input),
			contentType: input.contentType || 'image/jpeg',
			size: input.size,
			allowMultipart: false
		});
	}

	static async createContentPhotoUpload(input: {
		artistId: string;
		fileName: string;
		contentType: string;
		size: number;
	}) {
		return createTarget({
			kind: 'content-photo',
			bucket: 'images',
			key: contentPhotoKey(input),
			contentType: input.contentType || 'image/jpeg',
			size: input.size,
			allowMultipart: false
		});
	}

	static toStoredTarget(upload: MediaUploadTarget): StoredUploadTarget {
		return {
			kind: upload.kind,
			bucket: upload.bucket,
			key: upload.key,
			contentType: upload.contentType,
			size: upload.size,
			mode: upload.target.mode,
			uploadId: upload.target.mode === 'multipart' ? upload.target.uploadId : undefined,
			partSize: upload.target.mode === 'multipart' ? upload.target.partSize : undefined,
			partCount: upload.target.mode === 'multipart' ? upload.target.parts.length : undefined
		};
	}

	static async renewStoredTarget(input: StoredUploadTarget): Promise<MediaUploadTarget> {
		if (input.mode === 'multipart') {
			if (!input.uploadId || !input.partSize || !input.partCount) {
				throw new Error('Stored multipart upload is missing upload metadata');
			}

			return {
				kind: input.kind,
				bucket: input.bucket,
				key: input.key,
				contentType: input.contentType,
				size: input.size,
				target: {
					mode: 'multipart',
					bucket: input.bucket,
					key: input.key,
					uploadId: input.uploadId,
					partSize: input.partSize,
					parts: await signMultipartParts({
						bucket: input.bucket,
						key: input.key,
						uploadId: input.uploadId,
						partCount: input.partCount,
						partSize: input.partSize,
						size: input.size
					}),
					expiresIn: 15 * 60
				}
			};
		}

		return {
			kind: input.kind,
			bucket: input.bucket,
			key: input.key,
			contentType: input.contentType,
			size: input.size,
			target: await createPresignedPutUrl({
				bucket: input.bucket,
				key: input.key,
				contentType: input.contentType
			})
		};
	}

	static async completeMultipart(input: {
		upload: StoredUploadTarget;
		parts: Array<{ partNumber: number; etag: string }>;
	}) {
		if (input.upload.mode !== 'multipart') return;
		if (!input.upload.uploadId) throw new Error('Upload id is required');

		await completeMultipartUpload({
			bucket: input.upload.bucket,
			key: input.upload.key,
			uploadId: input.upload.uploadId,
			parts: input.parts
		});
	}

	static async verifyObject(input: StoredUploadTarget) {
		const object = await headR2Object({
			bucket: input.bucket,
			key: input.key
		});

		if (!object.exists) {
			return { ok: false as const, reason: 'Object was not found in R2' };
		}

		if (typeof object.contentLength === 'number' && object.contentLength !== input.size) {
			return {
				ok: false as const,
				reason: `Uploaded size mismatch: expected ${input.size}, got ${object.contentLength}`
			};
		}

		return { ok: true as const, object };
	}
}
