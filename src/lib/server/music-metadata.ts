import { parseBuffer } from 'music-metadata';

export interface TrackMetadata {
	duration: number | null;
	title: string | null;
	coverImageFile: File | null;
}

function getCoverExtension(format?: string | null): string {
	if (!format) return 'jpg';
	if (format.includes('/')) {
		const ext = format.split('/').pop();
		return ext && ext.length > 0 ? ext : 'jpg';
	}
	if (format.includes('.')) {
		const ext = format.split('.').pop();
		return ext && ext.length > 0 ? ext : 'jpg';
	}
	return format;
}

function normalizeTitle(title: string | null | undefined): string | null {
	if (!title) return null;
	const trimmed = title.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export async function extractTrackMetadata(file: File): Promise<TrackMetadata> {
	try {
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const metadata = await parseBuffer(buffer, {
			mimeType: file.type || undefined,
			size: buffer.length
		});

		const duration = Number.isFinite(metadata.format.duration)
			? Math.round(metadata.format.duration ?? 0)
			: null;
		const title = normalizeTitle(metadata.common.title ?? null);

		const picture = metadata.common.picture?.[0];
		let coverImageFile: File | null = null;
		if (picture?.data) {
			const ext = getCoverExtension(picture.format);
			const fileName = `cover.${ext}`;
			const mimeType = picture.format || `image/${ext}`;
			coverImageFile = new File([picture.data], fileName, { type: mimeType });
		}

		return { duration, title, coverImageFile };
	} catch (error) {
		console.error('Failed to parse track metadata:', error);
		return { duration: null, title: null, coverImageFile: null };
	}
}
