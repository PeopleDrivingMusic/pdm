import {
	ContentMediaService,
	GalleryService,
	PostService,
	StudioContentService,
	VideoService,
	type ContentStatus,
	type ContentVisibility,
	type CreatePostInput,
	type UpdatePostInput
} from '$lib/db/services/ContentService';
import type { NewContentMedia } from '$lib/db';

export type CollectionKind = 'photo_album' | 'video_collection';

export interface CollectionMutationInput {
	artistId: string;
	title: string;
	description?: string | null;
	visibility: ContentVisibility;
	status?: ContentStatus;
	scheduledAt?: Date | null;
}

export interface CollectionUpdateInput extends CollectionMutationInput {
	collectionId: string;
}

// Studio routes depend on this boundary so the in-process DB implementation can
// later be swapped for a remote Content service client.
export class ContentApplicationService {
	static async getStudioContent(artistId: string) {
		const [content, attachableMusic] = await Promise.all([
			StudioContentService.getOverview(artistId),
			StudioContentService.getAttachableMusic(artistId)
		]);

		return { content, attachableMusic };
	}

	static async createMedia(data: NewContentMedia) {
		return await ContentMediaService.createMedia(data);
	}

	static async createPost(input: CreatePostInput) {
		return await PostService.createPost(input);
	}

	static async updatePost(input: UpdatePostInput) {
		return await PostService.updatePost(input);
	}

	static async deletePost(input: { artistId: string; postId: string }) {
		return await PostService.deletePost(input);
	}

	static async canAttachMusic(input: { artistId: string; trackIds: string[]; albumIds: string[] }) {
		const [tracksOwned, albumsOwned] = await Promise.all([
			StudioContentService.assertTrackOwnership(input.artistId, input.trackIds),
			StudioContentService.assertAlbumOwnership(input.artistId, input.albumIds)
		]);

		return tracksOwned && albumsOwned;
	}

	static async createPhotoAlbum(input: CollectionMutationInput) {
		return await GalleryService.createAlbum({
			artistId: input.artistId,
			title: input.title,
			description: input.description,
			visibility: input.visibility,
			status: input.status ?? 'draft',
			scheduledAt: input.scheduledAt,
			mediaIds: []
		});
	}

	static async addPhotoToAlbum(input: { artistId: string; albumId: string; mediaId: string }) {
		return await GalleryService.addPhotoToAlbum(input);
	}

	static async createPhotoAlbumWithMedia(input: CollectionMutationInput & { mediaIds: string[] }) {
		return await GalleryService.createAlbum({
			artistId: input.artistId,
			title: input.title,
			description: input.description,
			visibility: input.visibility,
			status: input.status ?? 'draft',
			scheduledAt: input.scheduledAt,
			mediaIds: input.mediaIds
		});
	}

	static async updatePhotoAlbum(input: CollectionUpdateInput) {
		return await GalleryService.updateAlbum({
			artistId: input.artistId,
			albumId: input.collectionId,
			title: input.title,
			description: input.description,
			visibility: input.visibility,
			status: input.status ?? 'draft',
			scheduledAt: input.scheduledAt
		});
	}

	static async deletePhotoAlbum(input: { artistId: string; collectionId: string }) {
		return await GalleryService.deleteAlbum({
			artistId: input.artistId,
			albumId: input.collectionId
		});
	}

	static async createVideoCollection(input: CollectionMutationInput) {
		return await VideoService.createCollection({
			artistId: input.artistId,
			title: input.title,
			description: input.description,
			visibility: input.visibility,
			status: input.status ?? 'draft',
			scheduledAt: input.scheduledAt
		});
	}

	static async updateVideoCollection(input: CollectionUpdateInput) {
		return await VideoService.updateCollection({
			artistId: input.artistId,
			collectionId: input.collectionId,
			title: input.title,
			description: input.description,
			visibility: input.visibility,
			status: input.status ?? 'draft',
			scheduledAt: input.scheduledAt
		});
	}

	static async deleteVideoCollection(input: { artistId: string; collectionId: string }) {
		return await VideoService.deleteCollection(input);
	}

	static async createVideo(input: Parameters<typeof VideoService.createVideo>[0]) {
		return await VideoService.createVideo(input);
	}
}
