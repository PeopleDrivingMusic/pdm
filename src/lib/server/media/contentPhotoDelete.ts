import { deleteFileFromR2 } from '$lib/db/services/R2Service';

/** A content photo key an artist may delete looks like `${artistId}/content/photos/...`. */
export function isOwnedContentPhotoKey(artistId: string, key: string): boolean {
	return typeof key === 'string' && key.startsWith(`${artistId}/content/photos/`);
}

/**
 * Delete browser-uploaded post photos that were never attached to a post
 * (removed in the composer, or abandoned). Only keys the artist owns are touched.
 * Returns how many objects were deleted.
 */
export async function deleteOwnedContentPhotos(artistId: string, keys: string[]): Promise<number> {
	const owned = keys.filter((key) => isOwnedContentPhotoKey(artistId, key));
	let deleted = 0;
	for (const key of owned) {
		const ok = await deleteFileFromR2({ uniqueKey: key, bucket: 'images' });
		if (ok) deleted += 1;
	}
	return deleted;
}
