import { PUBLIC_R2_IMAGES_BUCKET } from '$env/static/public';
import { parseBlob } from 'music-metadata';

export interface ClientUploadPartTarget {
	partNumber: number;
	url: string;
	start: number;
	end: number;
}

export interface ClientSingleUploadTarget {
	mode: 'single';
	bucket: 'music' | 'images';
	key: string;
	url: string;
}

export interface ClientMultipartUploadTarget {
	mode: 'multipart';
	bucket: 'music' | 'images';
	key: string;
	uploadId: string;
	partSize: number;
	parts: ClientUploadPartTarget[];
}

export interface ClientMediaUploadTarget {
	kind: 'track-audio' | 'track-cover' | 'album-cover' | 'content-photo';
	bucket: 'music' | 'images';
	key: string;
	contentType: string;
	size: number;
	target: ClientSingleUploadTarget | ClientMultipartUploadTarget;
}

export interface UploadedMultipartPart {
	partNumber: number;
	etag: string;
}

export interface ClientUploadResult {
	key: string;
	mode: 'single' | 'multipart';
	parts: UploadedMultipartPart[];
}

interface StoredMultipartState {
	key: string;
	uploadId: string;
	parts: Record<string, { etag: string; size: number }>;
}

function encodeKeyForUrl(key: string) {
	return key.split('/').map(encodeURIComponent).join('/');
}

export function resolveR2ImageUrl(value?: string | null) {
	if (!value) return null;
	if (/^(https?:|data:|blob:)/i.test(value)) return value;
	if (value.startsWith('/uploads/')) return value;
	if (value.startsWith('uploads/')) return `/${value}`;
	if (value.startsWith('/')) return value;
	if (!PUBLIC_R2_IMAGES_BUCKET) return value;
	return `${PUBLIC_R2_IMAGES_BUCKET.replace(/\/+$/g, '')}/${encodeKeyForUrl(value)}`;
}

function readMultipartState(storageKey?: string): StoredMultipartState | null {
	if (!storageKey || typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(storageKey);
		return raw ? (JSON.parse(raw) as StoredMultipartState) : null;
	} catch {
		return null;
	}
}

function writeMultipartState(storageKey: string | undefined, state: StoredMultipartState) {
	if (!storageKey || typeof localStorage === 'undefined') return;
	localStorage.setItem(storageKey, JSON.stringify(state));
}

export function clearUploadResumeState(storageKey?: string) {
	if (!storageKey || typeof localStorage === 'undefined') return;
	localStorage.removeItem(storageKey);
}

function putWithProgress(input: {
	url: string;
	body: Blob;
	contentType?: string;
	onProgress?: (loaded: number, total: number) => void;
}) {
	return new Promise<{ etag: string | null }>((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('PUT', input.url);
		if (input.contentType) {
			xhr.setRequestHeader('Content-Type', input.contentType);
		}

		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable) {
				input.onProgress?.(event.loaded, event.total);
			}
		};
		xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'));
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve({ etag: xhr.getResponseHeader('ETag') });
				return;
			}
			reject(new Error(`Upload failed with status ${xhr.status}`));
		};
		xhr.send(input.body);
	});
}

export async function uploadR2Target(input: {
	file: File;
	upload: ClientMediaUploadTarget;
	storageKey?: string;
	onProgress?: (percent: number) => void;
}): Promise<ClientUploadResult> {
	const { file, upload, storageKey, onProgress } = input;
	const target = upload.target;
	onProgress?.(0);

	if (target.mode === 'single') {
		await putWithProgress({
			url: target.url,
			body: file,
			contentType: upload.contentType || file.type,
			onProgress: (loaded, total) => onProgress?.(total ? (loaded / total) * 100 : 0)
		});
		onProgress?.(100);
		clearUploadResumeState(storageKey);
		return { key: upload.key, mode: 'single', parts: [] };
	}

	const stored = readMultipartState(storageKey);
	const state: StoredMultipartState =
		stored?.key === upload.key && stored.uploadId === target.uploadId
			? stored
			: { key: upload.key, uploadId: target.uploadId, parts: {} };

	let uploadedBytes = target.parts.reduce((total, part) => {
		const storedPart = state.parts[String(part.partNumber)];
		return total + (storedPart ? storedPart.size : 0);
	}, 0);
	onProgress?.((uploadedBytes / upload.size) * 100);

	for (const part of target.parts) {
		const partKey = String(part.partNumber);
		if (state.parts[partKey]?.etag) continue;

		const blob = file.slice(part.start, part.end);
		const response = await putWithProgress({
			url: part.url,
			body: blob,
			onProgress: (loaded) => {
				onProgress?.(((uploadedBytes + loaded) / upload.size) * 100);
			}
		});

		if (!response.etag) {
			throw new Error(
				'R2 did not expose ETag for multipart upload. Check bucket CORS exposeHeaders.'
			);
		}

		uploadedBytes += blob.size;
		state.parts[partKey] = { etag: response.etag, size: blob.size };
		writeMultipartState(storageKey, state);
		onProgress?.((uploadedBytes / upload.size) * 100);
	}

	const parts = Object.entries(state.parts)
		.map(([partNumber, part]) => ({
			partNumber: Number(partNumber),
			etag: part.etag
		}))
		.sort((a, b) => a.partNumber - b.partNumber);

	return { key: upload.key, mode: 'multipart', parts };
}

export async function clientUploadFile({ file, url }: { file: File; url: string }) {
	try {
		await putWithProgress({
			url,
			body: file,
			contentType: file.type
		});
		return true;
	} catch (error) {
		console.error('R2 upload error:', error);
		return false;
	}
}

export interface TrackMetadata {
	duration: number | null;
	title: string | null;
	coverImageFile: File | null;
}

export async function extractTrackMetadata(file: File): Promise<TrackMetadata> {
	try {
		const metadata = await parseBlob(file);
		const duration = Number.isFinite(metadata.format.duration)
			? Math.round(metadata.format.duration ?? 0)
			: null;
		const title = metadata.common.title?.trim() || file.name.replace(/\.[^/.]+$/, '');
		const picture = metadata.common.picture?.[0];
		let coverImageFile: File | null = null;

		if (picture?.data) {
			const mimeType = picture.format || 'image/jpeg';
			const ext = mimeType.split('/').pop() || 'jpg';
			const coverData = new Uint8Array(
				picture.data.buffer as ArrayBuffer,
				picture.data.byteOffset,
				picture.data.byteLength
			);

			coverImageFile = new File([coverData], `cover.${ext}`, { type: mimeType });
		}

		return { duration, title, coverImageFile };
	} catch (error: any) {
		console.error('Failed to parse track metadata:', error?.message || error);
		return {
			duration: null,
			title: file.name.replace(/\.[^/.]+$/, ''),
			coverImageFile: null
		};
	}
}
