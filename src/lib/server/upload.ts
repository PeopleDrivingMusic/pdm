import path from 'path';
import { randomUUID } from 'crypto';
import {
	bucketForContentType,
	createPresignedPutUrl,
	isBucketName,
	putFileToR2,
	type BucketName
} from '$lib/db/services/R2Service';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export interface UploadResult {
	success: boolean;
	path?: string;
	url?: string;
	error?: string;
	presignedUrl?: string;
}

interface UploadFileOptions {
	subDir: string;
	allowedTypes?: string[];
	maxSize?: number;
	fileName?: string;
	fileType?: string;
	bucket?: BucketName | string;
}

function isFileLike(value: unknown): value is File {
	return typeof File !== 'undefined' && value instanceof File;
}

function getSafeExtension(originalName: string): string {
	return path.extname(originalName).toLowerCase();
}

function getInputName(input: string | File): string {
	return typeof input === 'string' ? input : input.name;
}

function sanitizeFileSegment(value: string) {
	const ext = getSafeExtension(value);
	const basename = path.basename(value, ext);
	const safeBase = basename
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 72);

	return `${safeBase || randomUUID()}${ext}`;
}

function buildKey(subDir: string, fileName: string) {
	return `${subDir.replace(/^\/+|\/+$/g, '')}/${sanitizeFileSegment(fileName)}`;
}

function validateFileType(file: File, allowedTypes: string[]): boolean {
	return allowedTypes.some((type) => {
		if (type.endsWith('/*')) {
			const prefix = type.split('/')[0];
			return file.type.startsWith(prefix + '/');
		}
		return file.type === type;
	});
}

function normalizeBucket(bucket: string | BucketName | undefined, fileType: string): BucketName {
	if (isBucketName(bucket)) return bucket;
	return bucketForContentType(fileType);
}

export async function uploadFile(
	file: File | null | undefined,
	options: UploadFileOptions
): Promise<UploadResult> {
	const {
		subDir,
		allowedTypes = [],
		maxSize = MAX_FILE_SIZE,
		fileName,
		fileType = file?.type || 'application/octet-stream',
		bucket
	} = options;

	if (!subDir) {
		return { success: false, error: 'Upload directory is required' };
	}

	if (file) {
		if (file.size > maxSize) {
			return {
				success: false,
				error: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`
			};
		}

		if (allowedTypes.length > 0 && !validateFileType(file, allowedTypes)) {
			return {
				success: false,
				error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
			};
		}
	}

	const resolvedFileName = fileName || (file ? file.name : randomUUID());
	const key = buildKey(subDir, resolvedFileName);
	const resolvedBucket = normalizeBucket(bucket, fileType);

	try {
		if (file) {
			await putFileToR2({
				bucket: resolvedBucket,
				key,
				file,
				contentType: fileType
			});

			return { success: true, path: key };
		}

		const target = await createPresignedPutUrl({
			bucket: resolvedBucket,
			key,
			contentType: fileType
		});

		return {
			success: true,
			path: key,
			presignedUrl: target.url
		};
	} catch (error) {
		console.error('Error preparing upload:', error);
		return {
			success: false,
			error: 'Failed to prepare upload'
		};
	}
}

export async function uploadImage(
	file: File,
	subDir?: string,
	fileName?: string
): Promise<UploadResult>;
export async function uploadImage(
	subDir?: string,
	fileName?: string,
	fileType?: string
): Promise<UploadResult>;
export async function uploadImage(
	fileOrSubDir?: File | string,
	subDirOrFileName?: string,
	fileNameOrFileType?: string
): Promise<UploadResult> {
	const input = fileOrSubDir ?? 'images';

	if (isFileLike(fileOrSubDir)) {
		return uploadFile(fileOrSubDir, {
			bucket: 'images',
			subDir: subDirOrFileName || 'images',
			fileName: fileNameOrFileType || fileOrSubDir.name,
			fileType: fileOrSubDir.type || 'image/jpeg',
			allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
			maxSize: 10 * 1024 * 1024
		});
	}

	return uploadFile(null, {
		bucket: 'images',
		subDir: typeof input === 'string' ? input : 'images',
		fileName: subDirOrFileName ?? randomUUID(),
		fileType: fileNameOrFileType ?? 'image/jpeg',
		allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
		maxSize: 10 * 1024 * 1024
	});
}

export async function uploadAudio(
	file: File,
	subDir?: string,
	fileName?: string
): Promise<UploadResult>;
export async function uploadAudio(
	subDir?: string,
	fileName?: string,
	fileType?: string
): Promise<UploadResult>;
export async function uploadAudio(
	fileOrSubDir?: File | string,
	subDirOrFileName?: string,
	fileNameOrFileType?: string
): Promise<UploadResult> {
	const input = fileOrSubDir ?? 'audio';

	if (isFileLike(fileOrSubDir)) {
		return uploadFile(fileOrSubDir, {
			bucket: 'music',
			subDir: subDirOrFileName || 'audio',
			fileName: fileNameOrFileType || fileOrSubDir.name,
			fileType: fileOrSubDir.type || 'audio/mpeg',
			allowedTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave'],
			maxSize: 100 * 1024 * 1024
		});
	}

	return uploadFile(null, {
		bucket: 'music',
		subDir: typeof input === 'string' ? input : 'audio',
		fileName: subDirOrFileName ?? randomUUID(),
		fileType: fileNameOrFileType ?? 'audio/mpeg',
		allowedTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave'],
		maxSize: 100 * 1024 * 1024
	});
}

// Unused stub, no callers in the codebase — file deletion for uploads goes through
// R2Service's deleteFileFromR2 instead.
export function deleteFile(): boolean {
	return true;
}

export function buildSourceAudioFileName(input: string | File) {
	return `source${getSafeExtension(getInputName(input)) || '.mp3'}`;
}

export function buildCoverFileName(id: string, input: string | File) {
	return `${id}${getSafeExtension(getInputName(input)) || '.jpg'}`;
}
