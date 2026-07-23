import { uploadR2Target, type ClientMediaUploadTarget } from '$lib/utils/helpers';

export interface PreparedPhoto {
	key: string;
	contentType: string;
	size: number;
}

async function requestUploadTarget(file: File): Promise<ClientMediaUploadTarget> {
	const response = await fetch('/api/studio/media/upload-target', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			kind: 'content-photo',
			fileName: file.name,
			contentType: file.type,
			size: file.size
		})
	});

	const result = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error(result?.error || 'Could not prepare photo upload');
	}
	return result.upload as ClientMediaUploadTarget;
}

/** Presign + upload a single post photo directly to R2, returning its stored key. */
export async function preparePostPhoto(
	file: File,
	onProgress?: (percent: number) => void
): Promise<PreparedPhoto> {
	const upload = await requestUploadTarget(file);
	await uploadR2Target({ file, upload, onProgress });
	return { key: upload.key, contentType: file.type, size: file.size };
}

const DELETE_ENDPOINT = '/api/studio/media/content-photo/delete';

/** Delete uploaded-but-unattached post photos from R2 (used when a photo is removed). */
export async function deleteContentPhotos(keys: string[]): Promise<void> {
	if (!keys.length) return;
	await fetch(DELETE_ENDPOINT, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ keys }),
		keepalive: true
	}).catch(() => {});
}

/** Best-effort cleanup that survives page unload (composer closed / tab left). */
export function beaconDeleteContentPhotos(keys: string[]): void {
	if (!keys.length || typeof navigator === 'undefined' || !navigator.sendBeacon) return;
	const blob = new Blob([JSON.stringify({ keys })], { type: 'application/json' });
	navigator.sendBeacon(DELETE_ENDPOINT, blob);
}
