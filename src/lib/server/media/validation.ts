export const AUDIO_MIME_TYPES = new Set([
	'audio/mpeg',
	'audio/mp3',
	'audio/wav',
	'audio/x-wav',
	'audio/wave'
]);

export const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const MAX_AUDIO_SIZE = 100 * 1024 * 1024;
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_MULTIPART_PARTS = 2000;

type Result = { ok: true } | { ok: false; reason: string };

function validate(
	allow: Set<string>,
	max: number,
	label: string,
	input: { contentType: string; size: number }
): Result {
	if (!Number.isFinite(input.size) || input.size <= 0) {
		return { ok: false, reason: `${label} size is invalid` };
	}
	if (!allow.has(input.contentType)) {
		return { ok: false, reason: `Unsupported ${label} format` };
	}
	if (input.size > max) {
		return { ok: false, reason: `${label} is too large` };
	}
	return { ok: true };
}

export function validateAudioUpload(input: { contentType: string; size: number }): Result {
	return validate(AUDIO_MIME_TYPES, MAX_AUDIO_SIZE, 'Audio', input);
}

export function validateImageUpload(input: { contentType: string; size: number }): Result {
	return validate(IMAGE_MIME_TYPES, MAX_IMAGE_SIZE, 'Image', input);
}

export function assertPartCount(size: number, partSize: number): void {
	if (Math.ceil(size / partSize) > MAX_MULTIPART_PARTS) {
		throw new Error('Upload exceeds maximum part count');
	}
}
