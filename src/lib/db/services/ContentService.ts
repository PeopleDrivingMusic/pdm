import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db, withDbLogging } from '$lib/db';
import {
	albums,
	artistFeedItems,
	contentMedia,
	photoAlbums,
	photos,
	postMedia,
	postMusicAttachments,
	postPollOptions,
	postPolls,
	posts,
	tracks,
	videos,
	videoCollectionItems,
	videoCollections
} from '$lib/db/schema';
import type {
	ArtistFeedItem,
	ContentMedia,
	NewContentMedia,
	NewPhotoAlbum,
	NewPost,
	NewPostPoll,
	NewVideo,
	NewVideoCollection,
	PhotoAlbum,
	Post,
	PostPoll,
	Video,
	VideoCollection
} from '$lib/db';

export type ContentStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type ContentVisibility = 'public' | 'followers' | 'subscribers' | 'investors';
export type FeedSourceType = 'post' | 'photo_album' | 'video' | 'track' | 'album' | 'merch';

export interface CreatePostInput {
	artistId: string;
	title: string;
	bodyJson?: Record<string, unknown> | null;
	bodyHtml?: string | null;
	excerpt?: string | null;
	visibility: ContentVisibility;
	status: ContentStatus;
	scheduledAt?: Date | null;
	mediaIds?: string[];
	trackIds?: string[];
	albumIds?: string[];
	poll?: {
		question: string;
		mode: 'single' | 'multiple';
		options: string[];
		closesAt?: Date | null;
		showResults: 'always' | 'after_vote' | 'after_close';
	} | null;
}

export interface StudioContentOverview {
	feedItems: ArtistFeedItem[];
	posts: Post[];
	photoAlbums: PhotoAlbum[];
	videos: Video[];
	videoCollections: VideoCollection[];
	counts: {
		all: number;
		posts: number;
		photos: number;
		videos: number;
		scheduled: number;
		drafts: number;
	};
}

function slugify(value: string) {
	const base = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/gi, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);

	return base || `content-${Date.now()}`;
}

function resolvePublishDate(status: ContentStatus, scheduledAt?: Date | null) {
	if (status === 'published') return new Date();
	return scheduledAt ?? null;
}

function stripHtml(value: string) {
	return value
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function buildExcerpt(bodyHtml?: string | null, fallback?: string | null) {
	const source = fallback?.trim() || stripHtml(bodyHtml ?? '');
	return source.length > 180 ? `${source.slice(0, 177)}...` : source;
}

function normalizeSourceUrl(pathOrUrl: string | null | undefined) {
	if (!pathOrUrl) return null;
	if (pathOrUrl.startsWith('/uploads/')) return pathOrUrl;
	if (pathOrUrl.startsWith('uploads/')) return `/${pathOrUrl}`;
	return `/uploads/${pathOrUrl}`;
}

export class ContentFeedService {
	static async upsertFeedItem(input: {
		artistId: string;
		sourceType: FeedSourceType;
		sourceId: string;
		title: string;
		previewText?: string | null;
		coverUrl?: string | null;
		visibility: ContentVisibility;
		status: ContentStatus;
		publishedAt?: Date | null;
		scheduledAt?: Date | null;
	}) {
		return await withDbLogging('ContentFeedService.upsertFeedItem', async () => {
			const [feedItem] = await db
				.insert(artistFeedItems)
				.values({
					artistId: input.artistId,
					sourceType: input.sourceType,
					sourceId: input.sourceId,
					title: input.title,
					previewText: input.previewText ?? null,
					coverUrl: normalizeSourceUrl(input.coverUrl),
					visibility: input.visibility,
					status: input.status,
					publishedAt: input.publishedAt ?? null,
					scheduledAt: input.scheduledAt ?? null
				})
				.onConflictDoUpdate({
					target: [artistFeedItems.sourceType, artistFeedItems.sourceId],
					set: {
						title: input.title,
						previewText: input.previewText ?? null,
						coverUrl: normalizeSourceUrl(input.coverUrl),
						visibility: input.visibility,
						status: input.status,
						publishedAt: input.publishedAt ?? null,
						scheduledAt: input.scheduledAt ?? null,
						updatedAt: new Date()
					}
				})
				.returning();

			return feedItem;
		});
	}

	static async deleteFeedItem(input: { sourceType: FeedSourceType; sourceId: string }) {
		return await withDbLogging('ContentFeedService.deleteFeedItem', async () => {
			await db
				.delete(artistFeedItems)
				.where(
					and(
						eq(artistFeedItems.sourceType, input.sourceType),
						eq(artistFeedItems.sourceId, input.sourceId)
					)
				);
		});
	}
}

export class ContentMediaService {
	static async createMedia(data: NewContentMedia): Promise<ContentMedia> {
		return await withDbLogging('ContentMediaService.createMedia', async () => {
			const [media] = await db.insert(contentMedia).values(data).returning();
			return media;
		});
	}
}

export class PostService {
	static async createPost(input: CreatePostInput): Promise<Post> {
		return await withDbLogging('PostService.createPost', async () => {
			const publishedAt = resolvePublishDate(input.status, input.scheduledAt);
			const excerpt = buildExcerpt(input.bodyHtml, input.excerpt);
			const slug = `${slugify(input.title)}-${Date.now().toString(36)}`;

			const [post] = await db
				.insert(posts)
				.values({
					artistId: input.artistId,
					title: input.title,
					slug,
					bodyJson: input.bodyJson ?? null,
					bodyHtml: input.bodyHtml ?? null,
					excerpt,
					visibility: input.visibility,
					status: input.status,
					publishedAt,
					scheduledAt: input.scheduledAt ?? null
				} satisfies NewPost)
				.returning();

			for (const [index, mediaId] of (input.mediaIds ?? []).entries()) {
				await db.insert(postMedia).values({
					postId: post.id,
					mediaId,
					sortOrder: index
				});
			}

			for (const [index, trackId] of (input.trackIds ?? []).entries()) {
				await db.insert(postMusicAttachments).values({
					postId: post.id,
					trackId,
					sortOrder: index
				});
			}

			for (const [index, albumId] of (input.albumIds ?? []).entries()) {
				await db.insert(postMusicAttachments).values({
					postId: post.id,
					albumId,
					sortOrder: index
				});
			}

			if (input.poll?.question && input.poll.options.length >= 2) {
				const [poll] = await db
					.insert(postPolls)
					.values({
						postId: post.id,
						question: input.poll.question,
						mode: input.poll.mode,
						closesAt: input.poll.closesAt ?? null,
						showResults: input.poll.showResults
					} satisfies NewPostPoll)
					.returning();

				for (const [index, option] of input.poll.options.entries()) {
					await db.insert(postPollOptions).values({
						pollId: poll.id,
						label: option,
						sortOrder: index
					});
				}
			}

			await ContentFeedService.upsertFeedItem({
				artistId: post.artistId,
				sourceType: 'post',
				sourceId: post.id,
				title: post.title,
				previewText: post.excerpt,
				coverUrl: null,
				visibility: post.visibility as ContentVisibility,
				status: post.status as ContentStatus,
				publishedAt: post.publishedAt,
				scheduledAt: post.scheduledAt
			});

			return post;
		});
	}

	static async getPostsByArtist(artistId: string): Promise<Post[]> {
		return await withDbLogging('PostService.getPostsByArtist', async () => {
			return await db
				.select()
				.from(posts)
				.where(eq(posts.artistId, artistId))
				.orderBy(desc(posts.createdAt));
		});
	}

	static async getPostPolls(postIds: string[]): Promise<PostPoll[]> {
		if (postIds.length === 0) return [];
		return await withDbLogging('PostService.getPostPolls', async () => {
			return await db.select().from(postPolls).where(inArray(postPolls.postId, postIds));
		});
	}
}

export class GalleryService {
	static async createAlbum(input: {
		artistId: string;
		title: string;
		description?: string | null;
		visibility: ContentVisibility;
		status: ContentStatus;
		scheduledAt?: Date | null;
		mediaIds: string[];
	}): Promise<PhotoAlbum> {
		return await withDbLogging('GalleryService.createAlbum', async () => {
			const publishedAt = resolvePublishDate(input.status, input.scheduledAt);
			const [album] = await db
				.insert(photoAlbums)
				.values({
					artistId: input.artistId,
					title: input.title,
					slug: `${slugify(input.title)}-${Date.now().toString(36)}`,
					description: input.description ?? null,
					visibility: input.visibility,
					status: input.status,
					publishedAt,
					scheduledAt: input.scheduledAt ?? null
				} satisfies NewPhotoAlbum)
				.returning();

			for (const [index, mediaId] of input.mediaIds.entries()) {
				await db.insert(photos).values({
					albumId: album.id,
					mediaId,
					sortOrder: index
				});
			}

			await ContentFeedService.upsertFeedItem({
				artistId: album.artistId,
				sourceType: 'photo_album',
				sourceId: album.id,
				title: album.title,
				previewText: album.description,
				coverUrl: null,
				visibility: album.visibility as ContentVisibility,
				status: album.status as ContentStatus,
				publishedAt: album.publishedAt,
				scheduledAt: album.scheduledAt
			});

			return album;
		});
	}

	static async addPhotoToAlbum(input: {
		artistId: string;
		albumId: string;
		mediaId: string;
	}): Promise<PhotoAlbum | null> {
		return await withDbLogging('GalleryService.addPhotoToAlbum', async () => {
			const [album] = await db
				.select()
				.from(photoAlbums)
				.where(and(eq(photoAlbums.id, input.albumId), eq(photoAlbums.artistId, input.artistId)))
				.limit(1);

			if (!album) return null;

			const [{ nextOrder }] = await db
				.select({ nextOrder: sql<number>`COALESCE(MAX(${photos.sortOrder}), -1) + 1` })
				.from(photos)
				.where(eq(photos.albumId, input.albumId));

			await db.insert(photos).values({
				albumId: input.albumId,
				mediaId: input.mediaId,
				sortOrder: nextOrder
			});

			return album;
		});
	}

	static async updateAlbum(input: {
		artistId: string;
		albumId: string;
		title: string;
		description?: string | null;
		visibility: ContentVisibility;
		status: ContentStatus;
		scheduledAt?: Date | null;
	}): Promise<PhotoAlbum | null> {
		return await withDbLogging('GalleryService.updateAlbum', async () => {
			const publishedAt = resolvePublishDate(input.status, input.scheduledAt);
			const [album] = await db
				.update(photoAlbums)
				.set({
					title: input.title,
					description: input.description ?? null,
					visibility: input.visibility,
					status: input.status,
					publishedAt,
					scheduledAt: input.scheduledAt ?? null,
					updatedAt: new Date()
				})
				.where(and(eq(photoAlbums.id, input.albumId), eq(photoAlbums.artistId, input.artistId)))
				.returning();

			if (!album) return null;

			await ContentFeedService.upsertFeedItem({
				artistId: album.artistId,
				sourceType: 'photo_album',
				sourceId: album.id,
				title: album.title,
				previewText: album.description,
				coverUrl: null,
				visibility: album.visibility as ContentVisibility,
				status: album.status as ContentStatus,
				publishedAt: album.publishedAt,
				scheduledAt: album.scheduledAt
			});

			return album;
		});
	}

	static async deleteAlbum(input: { artistId: string; albumId: string }): Promise<boolean> {
		return await withDbLogging('GalleryService.deleteAlbum', async () => {
			const [album] = await db
				.delete(photoAlbums)
				.where(and(eq(photoAlbums.id, input.albumId), eq(photoAlbums.artistId, input.artistId)))
				.returning({ id: photoAlbums.id });

			if (!album) return false;

			await ContentFeedService.deleteFeedItem({
				sourceType: 'photo_album',
				sourceId: input.albumId
			});

			return true;
		});
	}

	static async getAlbumsByArtist(artistId: string): Promise<PhotoAlbum[]> {
		return await withDbLogging('GalleryService.getAlbumsByArtist', async () => {
			return await db
				.select()
				.from(photoAlbums)
				.where(eq(photoAlbums.artistId, artistId))
				.orderBy(desc(photoAlbums.createdAt));
		});
	}
}

export class VideoService {
	static async createCollection(input: {
		artistId: string;
		title: string;
		description?: string | null;
		visibility: ContentVisibility;
		status: ContentStatus;
		scheduledAt?: Date | null;
		publishedAt?: Date | null;
	}): Promise<VideoCollection> {
		return await withDbLogging('VideoService.createCollection', async () => {
			const [collection] = await db
				.insert(videoCollections)
				.values({
					artistId: input.artistId,
					title: input.title,
					slug: `${slugify(input.title)}-${Date.now().toString(36)}`,
					description: input.description ?? null,
					visibility: input.visibility,
					status: input.status,
					publishedAt: input.publishedAt ?? resolvePublishDate(input.status, input.scheduledAt),
					scheduledAt: input.scheduledAt ?? null
				} satisfies NewVideoCollection)
				.returning();

			return collection;
		});
	}

	static async createVideo(input: {
		artistId: string;
		title: string;
		description?: string | null;
		videoMediaId?: string | null;
		thumbnailUrl?: string | null;
		visibility: ContentVisibility;
		status: ContentStatus;
		scheduledAt?: Date | null;
		collectionId?: string | null;
		newCollectionTitle?: string | null;
		newCollectionDescription?: string | null;
	}): Promise<Video> {
		return await withDbLogging('VideoService.createVideo', async () => {
			const publishedAt = resolvePublishDate(input.status, input.scheduledAt);
			const [video] = await db
				.insert(videos)
				.values({
					artistId: input.artistId,
					title: input.title,
					slug: `${slugify(input.title)}-${Date.now().toString(36)}`,
					description: input.description ?? null,
					videoMediaId: input.videoMediaId ?? null,
					thumbnailUrl: normalizeSourceUrl(input.thumbnailUrl),
					visibility: input.visibility,
					status: input.status,
					publishedAt,
					scheduledAt: input.scheduledAt ?? null
				} satisfies NewVideo)
				.returning();

			const collection = await this.resolveCollectionForVideo({
				artistId: input.artistId,
				collectionId: input.collectionId,
				newCollectionTitle: input.newCollectionTitle,
				newCollectionDescription: input.newCollectionDescription,
				visibility: input.visibility,
				status: input.status,
				publishedAt,
				scheduledAt: input.scheduledAt ?? null
			});

			if (collection) {
				const [{ nextOrder }] = await db
					.select({
						nextOrder: sql<number>`COALESCE(MAX(${videoCollectionItems.sortOrder}), -1) + 1`
					})
					.from(videoCollectionItems)
					.where(eq(videoCollectionItems.collectionId, collection.id));

				await db.insert(videoCollectionItems).values({
					collectionId: collection.id,
					videoId: video.id,
					sortOrder: nextOrder
				});
			}

			await ContentFeedService.upsertFeedItem({
				artistId: video.artistId,
				sourceType: 'video',
				sourceId: video.id,
				title: video.title,
				previewText: video.description,
				coverUrl: video.thumbnailUrl,
				visibility: video.visibility as ContentVisibility,
				status: video.status as ContentStatus,
				publishedAt: video.publishedAt,
				scheduledAt: video.scheduledAt
			});

			return video;
		});
	}

	static async resolveCollectionForVideo(input: {
		artistId: string;
		collectionId?: string | null;
		newCollectionTitle?: string | null;
		newCollectionDescription?: string | null;
		visibility: ContentVisibility;
		status: ContentStatus;
		publishedAt?: Date | null;
		scheduledAt?: Date | null;
	}): Promise<VideoCollection | null> {
		if (input.collectionId) {
			const [collection] = await db
				.select()
				.from(videoCollections)
				.where(
					and(
						eq(videoCollections.id, input.collectionId),
						eq(videoCollections.artistId, input.artistId)
					)
				)
				.limit(1);
			return collection ?? null;
		}

		const title = input.newCollectionTitle?.trim();
		if (!title) return null;

		return await this.createCollection({
			artistId: input.artistId,
			title,
			description: input.newCollectionDescription,
			visibility: input.visibility,
			status: input.status,
			publishedAt: input.publishedAt,
			scheduledAt: input.scheduledAt
		});
	}

	static async updateCollection(input: {
		artistId: string;
		collectionId: string;
		title: string;
		description?: string | null;
		visibility: ContentVisibility;
		status: ContentStatus;
		scheduledAt?: Date | null;
	}): Promise<VideoCollection | null> {
		return await withDbLogging('VideoService.updateCollection', async () => {
			const publishedAt = resolvePublishDate(input.status, input.scheduledAt);
			const [collection] = await db
				.update(videoCollections)
				.set({
					title: input.title,
					description: input.description ?? null,
					visibility: input.visibility,
					status: input.status,
					publishedAt,
					scheduledAt: input.scheduledAt ?? null,
					updatedAt: new Date()
				})
				.where(
					and(
						eq(videoCollections.id, input.collectionId),
						eq(videoCollections.artistId, input.artistId)
					)
				)
				.returning();

			return collection ?? null;
		});
	}

	static async deleteCollection(input: {
		artistId: string;
		collectionId: string;
	}): Promise<boolean> {
		return await withDbLogging('VideoService.deleteCollection', async () => {
			const [collection] = await db
				.delete(videoCollections)
				.where(
					and(
						eq(videoCollections.id, input.collectionId),
						eq(videoCollections.artistId, input.artistId)
					)
				)
				.returning({ id: videoCollections.id });

			return Boolean(collection);
		});
	}

	static async getVideosByArtist(artistId: string): Promise<Video[]> {
		return await withDbLogging('VideoService.getVideosByArtist', async () => {
			return await db
				.select()
				.from(videos)
				.where(eq(videos.artistId, artistId))
				.orderBy(desc(videos.createdAt));
		});
	}

	static async getCollectionsByArtist(artistId: string): Promise<VideoCollection[]> {
		return await withDbLogging('VideoService.getCollectionsByArtist', async () => {
			return await db
				.select()
				.from(videoCollections)
				.where(eq(videoCollections.artistId, artistId))
				.orderBy(desc(videoCollections.createdAt));
		});
	}
}

export class StudioContentService {
	static async getOverview(artistId: string): Promise<StudioContentOverview> {
		return await withDbLogging('StudioContentService.getOverview', async () => {
			const [feedItems, artistPosts, albumsResult, videosResult, videoCollectionsResult] =
				await Promise.all([
					db
						.select()
						.from(artistFeedItems)
						.where(eq(artistFeedItems.artistId, artistId))
						.orderBy(desc(artistFeedItems.pinned), desc(artistFeedItems.createdAt)),
					PostService.getPostsByArtist(artistId),
					GalleryService.getAlbumsByArtist(artistId),
					VideoService.getVideosByArtist(artistId),
					VideoService.getCollectionsByArtist(artistId)
				]);

			const countableItems = [
				...artistPosts,
				...albumsResult,
				...videosResult,
				...videoCollectionsResult
			];
			const counts = {
				all: countableItems.length,
				posts: artistPosts.length,
				photos: albumsResult.length,
				videos: videosResult.length + videoCollectionsResult.length,
				scheduled: countableItems.filter((item) => item.status === 'scheduled').length,
				drafts: countableItems.filter((item) => item.status === 'draft').length
			};

			return {
				feedItems,
				posts: artistPosts,
				photoAlbums: albumsResult,
				videos: videosResult,
				videoCollections: videoCollectionsResult,
				counts
			};
		});
	}

	static async getAttachableMusic(artistId: string) {
		return await withDbLogging('StudioContentService.getAttachableMusic', async () => {
			const [trackRows, albumRows] = await Promise.all([
				db
					.select({
						id: tracks.id,
						title: tracks.title,
						imageUrl: tracks.imageUrl,
						isPublished: tracks.isPublished
					})
					.from(tracks)
					.where(eq(tracks.artistId, artistId))
					.orderBy(desc(tracks.createdAt)),
				db
					.select({
						id: albums.id,
						title: albums.title,
						coverImageUrl: albums.coverImageUrl,
						isPublished: albums.isPublished
					})
					.from(albums)
					.where(eq(albums.artistId, artistId))
					.orderBy(desc(albums.createdAt))
			]);

			return {
				tracks: trackRows.map((track) => ({
					...track,
					imageUrl: normalizeSourceUrl(track.imageUrl)
				})),
				albums: albumRows.map((album) => ({
					...album,
					coverImageUrl: normalizeSourceUrl(album.coverImageUrl)
				}))
			};
		});
	}

	static async assertTrackOwnership(artistId: string, trackIds: string[]) {
		if (trackIds.length === 0) return true;
		const owned = await db
			.select({ id: tracks.id })
			.from(tracks)
			.where(and(eq(tracks.artistId, artistId), inArray(tracks.id, trackIds)));
		return owned.length === trackIds.length;
	}

	static async assertAlbumOwnership(artistId: string, albumIds: string[]) {
		if (albumIds.length === 0) return true;
		const owned = await db
			.select({ id: albums.id })
			.from(albums)
			.where(and(eq(albums.artistId, artistId), inArray(albums.id, albumIds)));
		return owned.length === albumIds.length;
	}
}
