import {
	AbortMultipartUploadCommand,
	CompleteMultipartUploadCommand,
	CreateMultipartUploadCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
	UploadPartCommand,
	type CompletedPart
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } from '$env/static/private';
import { logger } from '$lib/utils/logger';
import { MetricsCollector } from '$lib/utils/metrics';

export type BucketName = 'music' | 'images';

export interface R2PartTarget {
	partNumber: number;
	url: string;
	start: number;
	end: number;
}

export interface R2MultipartUploadTarget {
	mode: 'multipart';
	bucket: BucketName;
	key: string;
	uploadId: string;
	partSize: number;
	parts: R2PartTarget[];
	expiresIn: number;
}

export interface R2SingleUploadTarget {
	mode: 'single';
	bucket: BucketName;
	key: string;
	url: string;
	expiresIn: number;
}

export type R2UploadTarget = R2SingleUploadTarget | R2MultipartUploadTarget;

export const R2_MULTIPART_PART_SIZE = 8 * 1024 * 1024;
const SIGNED_UPLOAD_TTL_SECONDS = 15 * 60;
const SIGNED_READ_TTL_SECONDS = 60 * 60;

const r2Client = new S3Client({
	region: 'auto',
	endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY
	}
});

export function isBucketName(value: unknown): value is BucketName {
	return value === 'music' || value === 'images';
}

export function bucketForContentType(contentType: string): BucketName {
	return contentType.startsWith('audio/') ? 'music' : 'images';
}

export async function createPresignedPutUrl(input: {
	bucket: BucketName;
	key: string;
	contentType: string;
	expiresIn?: number;
}): Promise<R2SingleUploadTarget> {
	const command = new PutObjectCommand({
		Bucket: input.bucket,
		Key: input.key,
		ContentType: input.contentType
	});

	const expiresIn = input.expiresIn ?? SIGNED_UPLOAD_TTL_SECONDS;
	const url = await getSignedUrl(r2Client, command, { expiresIn });

	return {
		mode: 'single',
		bucket: input.bucket,
		key: input.key,
		url,
		expiresIn
	};
}

export async function createMultipartUpload(input: {
	bucket: BucketName;
	key: string;
	contentType: string;
	size: number;
	partSize?: number;
	expiresIn?: number;
}): Promise<R2MultipartUploadTarget> {
	const partSize = input.partSize ?? R2_MULTIPART_PART_SIZE;
	const partCount = Math.ceil(input.size / partSize);
	const expiresIn = input.expiresIn ?? SIGNED_UPLOAD_TTL_SECONDS;

	const createResponse = await r2Client.send(
		new CreateMultipartUploadCommand({
			Bucket: input.bucket,
			Key: input.key,
			ContentType: input.contentType
		})
	);

	if (!createResponse.UploadId) {
		throw new Error('R2 did not return an upload id');
	}

	const parts = await signMultipartParts({
		bucket: input.bucket,
		key: input.key,
		uploadId: createResponse.UploadId,
		partCount,
		partSize,
		size: input.size,
		expiresIn
	});

	return {
		mode: 'multipart',
		bucket: input.bucket,
		key: input.key,
		uploadId: createResponse.UploadId,
		partSize,
		parts,
		expiresIn
	};
}

export async function signMultipartParts(input: {
	bucket: BucketName;
	key: string;
	uploadId: string;
	partCount: number;
	partSize: number;
	size: number;
	expiresIn?: number;
}): Promise<R2PartTarget[]> {
	const expiresIn = input.expiresIn ?? SIGNED_UPLOAD_TTL_SECONDS;
	const parts: R2PartTarget[] = [];

	for (let partNumber = 1; partNumber <= input.partCount; partNumber += 1) {
		const start = (partNumber - 1) * input.partSize;
		const end = Math.min(start + input.partSize, input.size);
		const command = new UploadPartCommand({
			Bucket: input.bucket,
			Key: input.key,
			UploadId: input.uploadId,
			PartNumber: partNumber
		});

		parts.push({
			partNumber,
			start,
			end,
			url: await getSignedUrl(r2Client, command, { expiresIn })
		});
	}

	return parts;
}

export async function completeMultipartUpload(input: {
	bucket: BucketName;
	key: string;
	uploadId: string;
	parts: Array<{ partNumber: number; etag: string }>;
}) {
	const parts: CompletedPart[] = input.parts
		.slice()
		.sort((a, b) => a.partNumber - b.partNumber)
		.map((part) => ({
			PartNumber: part.partNumber,
			ETag: part.etag
		}));

	await r2Client.send(
		new CompleteMultipartUploadCommand({
			Bucket: input.bucket,
			Key: input.key,
			UploadId: input.uploadId,
			MultipartUpload: { Parts: parts }
		})
	);
}

export async function abortMultipartUpload(input: {
	bucket: BucketName;
	key: string;
	uploadId: string;
}) {
	await r2Client.send(
		new AbortMultipartUploadCommand({
			Bucket: input.bucket,
			Key: input.key,
			UploadId: input.uploadId
		})
	);
}

export async function putFileToR2(input: {
	bucket: BucketName;
	key: string;
	file: File;
	contentType?: string;
}) {
	const body = new Uint8Array(await input.file.arrayBuffer());
	await r2Client.send(
		new PutObjectCommand({
			Bucket: input.bucket,
			Key: input.key,
			Body: body,
			ContentType: input.contentType ?? input.file.type
		})
	);
}

export async function headR2Object(input: { bucket: BucketName; key: string }) {
	try {
		const response = await r2Client.send(
			new HeadObjectCommand({
				Bucket: input.bucket,
				Key: input.key
			})
		);

		return {
			exists: true,
			contentLength: response.ContentLength ?? null,
			contentType: response.ContentType ?? null,
			etag: response.ETag ?? null
		};
	} catch (error) {
		const statusCode =
			typeof error === 'object' && error && '$metadata' in error
				? (error.$metadata as { httpStatusCode?: number }).httpStatusCode
				: undefined;

		if (statusCode === 404) {
			return {
				exists: false,
				contentLength: null,
				contentType: null,
				etag: null
			};
		}

		throw error;
	}
}

export async function getFileUrlFromR2({
	uniqueKey,
	bucket = 'music'
}: {
	uniqueKey: string;
	bucket?: BucketName;
}): Promise<{ streamUrl: string }> {
	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: uniqueKey
	});

	return {
		streamUrl: await getSignedUrl(r2Client, command, { expiresIn: SIGNED_READ_TTL_SECONDS })
	};
}

export async function deleteFileFromR2({
	uniqueKey,
	bucket = 'music'
}: {
	uniqueKey: string;
	bucket?: BucketName;
}): Promise<boolean> {
	if (!uniqueKey) return true;

	try {
		await r2Client.send(
			new DeleteObjectCommand({
				Bucket: bucket,
				Key: uniqueKey
			})
		);
		return true;
	} catch (error) {
		MetricsCollector.recordR2Error('deleteObject');
		logger.error('R2 deleteObject failed', {
			component: 'media',
			metadata: { error, key: uniqueKey, bucket }
		});
		return false;
	}
}

export async function uploadToR2(input: {
	subDir: string;
	filetype: string;
	filename: string;
	bucket?: BucketName;
}): Promise<{ presignedUrl: string; uniqueKey: string }> {
	const uniqueKey = `${input.subDir}/${input.filename}`;
	const target = await createPresignedPutUrl({
		bucket: input.bucket ?? bucketForContentType(input.filetype),
		key: uniqueKey,
		contentType: input.filetype
	});

	return {
		presignedUrl: target.url,
		uniqueKey
	};
}

export async function deleteFromR2(uniqueKey: string): Promise<{ success: boolean }> {
	return { success: await deleteFileFromR2({ uniqueKey, bucket: 'music' }) };
}
