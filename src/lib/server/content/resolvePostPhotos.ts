import { headR2Object } from '$lib/db/services/R2Service';
import { ContentApplicationService } from './ContentApplicationService';

export interface UploadedPhotoInput {
	key: string;
	contentType?: string | null;
	size?: number | null;
}

/** Thrown when an uploaded post photo fails verification (missing / size mismatch). */
export class PostPhotoError extends Error {
	status: number;
	constructor(message: string, status = 400) {
		super(message);
		this.name = 'PostPhotoError';
		this.status = status;
	}
}

/**
 * Verify each browser-uploaded photo landed in R2, then create a content-media
 * row per key. Returns the new media ids (order preserved) to attach to a post.
 */
export async function resolvePostPhotoMedia(
	artistId: string,
	photos: UploadedPhotoInput[]
): Promise<string[]> {
	const mediaIds: string[] = [];

	for (const photo of photos) {
		if (!photo.key) continue;

		const object = await headR2Object({ bucket: 'images', key: photo.key });
		if (!object.exists) {
			throw new PostPhotoError('Uploaded photo was not found in storage');
		}
		if (
			photo.size &&
			typeof object.contentLength === 'number' &&
			object.contentLength !== photo.size
		) {
			throw new PostPhotoError('Uploaded photo size does not match metadata');
		}

		const media = await ContentApplicationService.createMedia({
			artistId,
			type: 'image',
			fileUrl: photo.key,
			metadata: {
				contentType: photo.contentType ?? null,
				size: photo.size ?? null,
				uploadStatus: 'uploaded'
			}
		});
		mediaIds.push(media.id);
	}

	return mediaIds;
}
