import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
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
	postPollVotes,
	posts,
	tracks,
	videos,
	videoCollectionItems,
	videoCollections
} from '$lib/db/schema';
import { postDocumentRepository } from './PostDocumentRepository';
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

export interface ArtistContentViewer {
	userId?: string | null;
	isOwner?: boolean;
	isFollower?: boolean;
	isSubscriber?: boolean;
	isInvestor?: boolean;
}

export interface PublicArtistPost {
	id: string;
	type: 'post';
	title: string;
	slug: string;
	excerpt: string | null;
	bodyHtml: string | null;
	visibility: ContentVisibility;
	publishedAt: Date | null;
	isLocked: boolean;
	lockReason: string | null;
	media: Array<{
		id: string;
		type: string;
		fileUrl: string;
		thumbnailUrl: string | null;
		alt: string | null;
		caption: string | null;
	}>;
	musicAttachments: Array<{
		id: string;
		type: 'track' | 'album';
		title: string;
		imageUrl: string | null;
	}>;
	poll: {
		id: string;
		question: string | null;
		mode: string;
		showResults: string;
		closesAt: Date | null;
		totalVotes: number;
		hasVoted: boolean;
		options: Array<{ id: string; label: string; votes: number; selected: boolean }>;
	} | null;
}

export interface PublicPhotoAlbum {
	id: string;
	type: 'photo_album';
	title: string;
	slug: string;
	description: string | null;
	visibility: ContentVisibility;
	publishedAt: Date | null;
	isLocked: boolean;
	lockReason: string | null;
	photos: Array<{
		id: string;
		fileUrl: string;
		thumbnailUrl: string | null;
		alt: string | null;
		caption: string | null;
	}>;
}

export interface PublicArtistVideo {
	id: string;
	type: 'video';
	title: string;
	slug: string;
	description: string | null;
	thumbnailUrl: string | null;
	duration: number | null;
	visibility: ContentVisibility;
	publishedAt: Date | null;
	isLocked: boolean;
	lockReason: string | null;
}

export interface PublicVideoCollection {
	id: string;
	type: 'video_collection';
	title: string;
	slug: string;
	description: string | null;
	visibility: ContentVisibility;
	publishedAt: Date | null;
	isLocked: boolean;
	lockReason: string | null;
	videos: PublicArtistVideo[];
}

export type PublicArtistFeedItem =
	| (PublicArtistPost & { feedType: 'post' })
	| (PublicPhotoAlbum & { feedType: 'photo_album' })
	| (PublicArtistVideo & { feedType: 'video' })
	| (PublicVideoCollection & { feedType: 'video_collection' });

export interface PublicArtistContent {
	feed: PublicArtistFeedItem[];
	posts: PublicArtistPost[];
	photoAlbums: PublicPhotoAlbum[];
	videos: PublicArtistVideo[];
	videoCollections: PublicVideoCollection[];
}

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
		question: string | null;
		mode: 'single' | 'multiple';
		options: string[];
		closesAt?: Date | null;
		showResults: 'always' | 'after_vote' | 'after_close';
	} | null;
}

export interface UpdatePostInput {
	artistId: string;
	postId: string;
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
	poll?: CreatePostInput['poll'];
	pollEnabled?: boolean;
}

export interface StudioPostForEdit extends Post {
	mediaIds: string[];
	trackIds: string[];
	albumIds: string[];
	poll: {
		id: string;
		question: string | null;
		mode: string;
		showResults: string;
		closesAt: Date | null;
		options: Array<{ id: string; label: string }>;
	} | null;
}

export interface StudioContentOverview {
	feedItems: ArtistFeedItem[];
	posts: StudioPostForEdit[];
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

type PostPollInput = NonNullable<CreatePostInput['poll']>;

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

function canViewVisibility(visibility: ContentVisibility, viewer: ArtistContentViewer) {
	if (viewer.isOwner) return true;
	if (visibility === 'public') return true;
	if (visibility === 'followers') return Boolean(viewer.isFollower || viewer.isSubscriber);
	if (visibility === 'subscribers') return Boolean(viewer.isSubscriber);
	if (visibility === 'investors') return Boolean(viewer.isInvestor);
	return false;
}

function lockReasonFor(visibility: ContentVisibility) {
	if (visibility === 'followers') return 'Follow this artist to unlock';
	if (visibility === 'subscribers') return 'Subscribe to unlock';
	if (visibility === 'investors') return 'Available to supporters';
	return null;
}

function sanitizeVisibility(value: string): ContentVisibility {
	if (value === 'followers' || value === 'subscribers' || value === 'investors') return value;
	return 'public';
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
	private static async createPoll(postId: string, pollInput: PostPollInput) {
		const [poll] = await db
			.insert(postPolls)
			.values({
				postId,
				question: pollInput.question || null,
				mode: pollInput.mode,
				closesAt: pollInput.closesAt ?? null,
				showResults: pollInput.showResults
			} satisfies NewPostPoll)
			.returning();

		for (const [index, option] of pollInput.options.entries()) {
			await db.insert(postPollOptions).values({
				pollId: poll.id,
				label: option,
				sortOrder: index
			});
		}

		return poll;
	}

	private static async syncPostPoll(input: {
		postId: string;
		pollEnabled?: boolean;
		poll?: CreatePostInput['poll'];
	}) {
		const [existingPoll] = await db
			.select()
			.from(postPolls)
			.where(eq(postPolls.postId, input.postId))
			.limit(1);

		const [voteCountRow] = existingPoll
			? await db
					.select({ count: sql<number>`count(*)::int` })
					.from(postPollVotes)
					.where(eq(postPollVotes.pollId, existingPoll.id))
			: [{ count: 0 }];

		const voteCount = Number(voteCountRow?.count ?? 0);
		const hasVotes = voteCount > 0;

		if (!input.pollEnabled || !input.poll || input.poll.options.length < 2) {
			if (!existingPoll) return;
			if (hasVotes) {
				throw new Error('Poll already has votes and cannot be removed from this post.');
			}

			await db.delete(postPolls).where(eq(postPolls.id, existingPoll.id));
			return;
		}

		if (!existingPoll) {
			await PostService.createPoll(input.postId, input.poll);
			return;
		}

		if (hasVotes) {
			const existingOptions = await db
				.select()
				.from(postPollOptions)
				.where(eq(postPollOptions.pollId, existingPoll.id))
				.orderBy(asc(postPollOptions.sortOrder));
			const currentLabels = existingOptions.map((option) => option.label.trim());
			const nextLabels = input.poll.options.map((option) => option.trim());
			const optionsUnchanged =
				currentLabels.length === nextLabels.length &&
				currentLabels.every((label, index) => label === nextLabels[index]);

			if (!optionsUnchanged) {
				throw new Error('Poll already has votes. Poll options cannot be changed.');
			}

			await db
				.update(postPolls)
				.set({
					question: input.poll.question || null,
					mode: input.poll.mode,
					closesAt: input.poll.closesAt ?? null,
					showResults: input.poll.showResults,
					updatedAt: new Date()
				})
				.where(eq(postPolls.id, existingPoll.id));
			return;
		}

		await db
			.update(postPolls)
			.set({
				question: input.poll.question || null,
				mode: input.poll.mode,
				closesAt: input.poll.closesAt ?? null,
				showResults: input.poll.showResults,
				updatedAt: new Date()
			})
			.where(eq(postPolls.id, existingPoll.id));

		await db.delete(postPollOptions).where(eq(postPollOptions.pollId, existingPoll.id));
		for (const [index, option] of input.poll.options.entries()) {
			await db.insert(postPollOptions).values({
				pollId: existingPoll.id,
				label: option,
				sortOrder: index
			});
		}
	}

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
					excerpt,
					visibility: input.visibility,
					status: input.status,
					publishedAt,
					scheduledAt: input.scheduledAt ?? null
				} satisfies NewPost)
				.returning();

			await postDocumentRepository.savePostDocument({
				postId: post.id,
				bodyJson: input.bodyJson ?? null,
				bodyHtml: input.bodyHtml ?? null
			});

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

			if (input.poll && input.poll.options.length >= 2) {
				await PostService.createPoll(post.id, input.poll);
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

	static async getPostsForStudio(artistId: string): Promise<StudioPostForEdit[]> {
		return await withDbLogging('PostService.getPostsForStudio', async () => {
			const postRows = await PostService.getPostsByArtist(artistId);
			const postIds = postRows.map((post) => post.id);
			if (postIds.length === 0) return [];

			const [documentsByPost, mediaRows, musicRows, pollRows, optionRows] = await Promise.all([
				postDocumentRepository.getPostDocuments(postIds),
				db
					.select()
					.from(postMedia)
					.where(inArray(postMedia.postId, postIds))
					.orderBy(asc(postMedia.sortOrder)),
				db
					.select()
					.from(postMusicAttachments)
					.where(inArray(postMusicAttachments.postId, postIds))
					.orderBy(asc(postMusicAttachments.sortOrder)),
				db.select().from(postPolls).where(inArray(postPolls.postId, postIds)),
				db
					.select({
						postId: postPolls.postId,
						option: postPollOptions
					})
					.from(postPollOptions)
					.innerJoin(postPolls, eq(postPollOptions.pollId, postPolls.id))
					.where(inArray(postPolls.postId, postIds))
					.orderBy(asc(postPollOptions.sortOrder))
			]);

			const mediaIdsByPost = new Map<string, string[]>();
			for (const row of mediaRows) {
				const ids = mediaIdsByPost.get(row.postId) ?? [];
				ids.push(row.mediaId);
				mediaIdsByPost.set(row.postId, ids);
			}

			const trackIdsByPost = new Map<string, string[]>();
			const albumIdsByPost = new Map<string, string[]>();
			for (const row of musicRows) {
				if (row.trackId) {
					const ids = trackIdsByPost.get(row.postId) ?? [];
					ids.push(row.trackId);
					trackIdsByPost.set(row.postId, ids);
				}
				if (row.albumId) {
					const ids = albumIdsByPost.get(row.postId) ?? [];
					ids.push(row.albumId);
					albumIdsByPost.set(row.postId, ids);
				}
			}

			const pollByPost = new Map<string, (typeof pollRows)[number]>();
			for (const poll of pollRows) pollByPost.set(poll.postId, poll);

			const optionsByPost = new Map<string, typeof optionRows>();
			for (const row of optionRows) {
				const rows = optionsByPost.get(row.postId) ?? [];
				rows.push(row);
				optionsByPost.set(row.postId, rows);
			}

			return postRows.map((post) => {
				const poll = pollByPost.get(post.id);
				const document = documentsByPost.get(post.id);

				return {
					...post,
					bodyJson: document?.bodyJson ?? null,
					bodyHtml: document?.bodyHtml ?? null,
					mediaIds: mediaIdsByPost.get(post.id) ?? [],
					trackIds: trackIdsByPost.get(post.id) ?? [],
					albumIds: albumIdsByPost.get(post.id) ?? [],
					poll: poll
						? {
								id: poll.id,
								question: poll.question,
								mode: poll.mode,
								showResults: poll.showResults,
								closesAt: poll.closesAt,
								options: (optionsByPost.get(post.id) ?? []).map((row) => ({
									id: row.option.id,
									label: row.option.label
								}))
							}
						: null
				};
			});
		});
	}

	static async updatePost(input: UpdatePostInput): Promise<Post | null> {
		return await withDbLogging('PostService.updatePost', async () => {
			const [existingPost] = await db
				.select({ id: posts.id })
				.from(posts)
				.where(and(eq(posts.id, input.postId), eq(posts.artistId, input.artistId)))
				.limit(1);

			if (!existingPost) return null;

			await PostService.syncPostPoll({
				postId: input.postId,
				pollEnabled: input.pollEnabled,
				poll: input.poll
			});

			const publishedAt = resolvePublishDate(input.status, input.scheduledAt);
			const excerpt = buildExcerpt(input.bodyHtml ?? '', input.excerpt);
			const [post] = await db
				.update(posts)
				.set({
					title: input.title,
					excerpt,
					visibility: input.visibility,
					status: input.status,
					publishedAt,
					scheduledAt: input.scheduledAt ?? null,
					updatedAt: new Date()
				})
				.where(and(eq(posts.id, input.postId), eq(posts.artistId, input.artistId)))
				.returning();

			if (!post) return null;

			await postDocumentRepository.savePostDocument({
				postId: post.id,
				bodyJson: input.bodyJson ?? null,
				bodyHtml: input.bodyHtml ?? null
			});

			await Promise.all([
				db.delete(postMedia).where(eq(postMedia.postId, post.id)),
				db.delete(postMusicAttachments).where(eq(postMusicAttachments.postId, post.id))
			]);

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

	static async deletePost(input: { artistId: string; postId: string }) {
		return await withDbLogging('PostService.deletePost', async () => {
			const [existingPost] = await db
				.select({ id: posts.id })
				.from(posts)
				.where(and(eq(posts.id, input.postId), eq(posts.artistId, input.artistId)))
				.limit(1);

			if (!existingPost) return false;

			await db
				.delete(artistFeedItems)
				.where(
					and(
						eq(artistFeedItems.artistId, input.artistId),
						eq(artistFeedItems.sourceType, 'post'),
						eq(artistFeedItems.sourceId, input.postId)
					)
				);

			await postDocumentRepository.deletePostDocument(input.postId);

			await db
				.delete(posts)
				.where(and(eq(posts.id, input.postId), eq(posts.artistId, input.artistId)))
				.returning();

			return true;
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

export class ArtistPublicContentService {
	static async getArtistContent(
		artistId: string,
		viewer: ArtistContentViewer = {}
	): Promise<PublicArtistContent> {
		return await withDbLogging('ArtistPublicContentService.getArtistContent', async () => {
			const [postRows, albumRows, videoRows, collectionRows] = await Promise.all([
				db
					.select()
					.from(posts)
					.where(and(eq(posts.artistId, artistId), eq(posts.status, 'published')))
					.orderBy(desc(posts.publishedAt), desc(posts.createdAt)),
				db
					.select()
					.from(photoAlbums)
					.where(and(eq(photoAlbums.artistId, artistId), eq(photoAlbums.status, 'published')))
					.orderBy(desc(photoAlbums.publishedAt), desc(photoAlbums.createdAt)),
				db
					.select()
					.from(videos)
					.where(and(eq(videos.artistId, artistId), eq(videos.status, 'published')))
					.orderBy(desc(videos.publishedAt), desc(videos.createdAt)),
				db
					.select()
					.from(videoCollections)
					.where(and(eq(videoCollections.artistId, artistId), eq(videoCollections.status, 'published')))
					.orderBy(desc(videoCollections.publishedAt), desc(videoCollections.createdAt))
			]);

			const postIds = postRows.map((post) => post.id);
			const photoAlbumIds = albumRows.map((album) => album.id);
			const videoIds = videoRows.map((video) => video.id);
			const collectionIds = collectionRows.map((collection) => collection.id);

			const [
				documentsByPost,
				mediaRows,
				musicRows,
				pollRows,
				pollOptionRows,
				pollVoteRows,
				viewerVoteRows,
				photoRows,
				collectionItemRows
			] = await Promise.all([
				postDocumentRepository.getPostDocuments(postIds),
				postIds.length
					? db
							.select({
								postId: postMedia.postId,
								sortOrder: postMedia.sortOrder,
								media: contentMedia
							})
							.from(postMedia)
							.innerJoin(contentMedia, eq(postMedia.mediaId, contentMedia.id))
							.where(inArray(postMedia.postId, postIds))
							.orderBy(asc(postMedia.sortOrder))
					: [],
				postIds.length
					? db
							.select({
								postId: postMusicAttachments.postId,
								sortOrder: postMusicAttachments.sortOrder,
								attachment: postMusicAttachments,
								trackTitle: tracks.title,
								trackImageUrl: tracks.imageUrl,
								albumTitle: albums.title,
								albumCoverImageUrl: albums.coverImageUrl
							})
							.from(postMusicAttachments)
							.leftJoin(tracks, eq(postMusicAttachments.trackId, tracks.id))
							.leftJoin(albums, eq(postMusicAttachments.albumId, albums.id))
							.where(inArray(postMusicAttachments.postId, postIds))
							.orderBy(asc(postMusicAttachments.sortOrder))
					: [],
				postIds.length
					? db.select().from(postPolls).where(inArray(postPolls.postId, postIds))
					: [],
				postIds.length
					? db
							.select({
								option: postPollOptions,
								postId: postPolls.postId
							})
							.from(postPollOptions)
							.innerJoin(postPolls, eq(postPollOptions.pollId, postPolls.id))
							.where(inArray(postPolls.postId, postIds))
							.orderBy(asc(postPollOptions.sortOrder))
					: [],
				postIds.length
					? db
							.select({
								optionId: postPollVotes.optionId,
								votes: sql<number>`count(*)::int`
							})
							.from(postPollVotes)
							.innerJoin(postPolls, eq(postPollVotes.pollId, postPolls.id))
							.where(inArray(postPolls.postId, postIds))
							.groupBy(postPollVotes.optionId)
					: [],
				postIds.length && viewer.userId
					? db
							.select({
								pollId: postPollVotes.pollId,
								optionId: postPollVotes.optionId
							})
							.from(postPollVotes)
							.innerJoin(postPolls, eq(postPollVotes.pollId, postPolls.id))
							.where(and(inArray(postPolls.postId, postIds), eq(postPollVotes.userId, viewer.userId)))
					: [],
				photoAlbumIds.length
					? db
							.select({
								albumId: photos.albumId,
								sortOrder: photos.sortOrder,
								photo: photos,
								media: contentMedia
							})
							.from(photos)
							.innerJoin(contentMedia, eq(photos.mediaId, contentMedia.id))
							.where(inArray(photos.albumId, photoAlbumIds))
							.orderBy(asc(photos.sortOrder))
					: [],
				collectionIds.length
					? db
							.select()
							.from(videoCollectionItems)
							.where(inArray(videoCollectionItems.collectionId, collectionIds))
							.orderBy(asc(videoCollectionItems.sortOrder))
					: []
			]);

			const mediaByPost = new Map<string, typeof mediaRows>();
			for (const row of mediaRows) {
				const rows = mediaByPost.get(row.postId) ?? [];
				rows.push(row);
				mediaByPost.set(row.postId, rows);
			}

			const musicByPost = new Map<string, typeof musicRows>();
			for (const row of musicRows) {
				const rows = musicByPost.get(row.postId) ?? [];
				rows.push(row);
				musicByPost.set(row.postId, rows);
			}

			const pollByPost = new Map<string, (typeof pollRows)[number]>();
			for (const poll of pollRows) pollByPost.set(poll.postId, poll);

			const optionsByPost = new Map<string, typeof pollOptionRows>();
			for (const row of pollOptionRows) {
				const rows = optionsByPost.get(row.postId) ?? [];
				rows.push(row);
				optionsByPost.set(row.postId, rows);
			}

			const votesByOption = new Map<string, number>();
			for (const row of pollVoteRows) votesByOption.set(row.optionId, Number(row.votes));

			const viewerVotesByPoll = new Map<string, Set<string>>();
			for (const row of viewerVoteRows) {
				const votes = viewerVotesByPoll.get(row.pollId) ?? new Set<string>();
				votes.add(row.optionId);
				viewerVotesByPoll.set(row.pollId, votes);
			}

			const photosByAlbum = new Map<string, typeof photoRows>();
			for (const row of photoRows) {
				const rows = photosByAlbum.get(row.albumId) ?? [];
				rows.push(row);
				photosByAlbum.set(row.albumId, rows);
			}

			const videosById = new Map(videoRows.map((video) => [video.id, video]));
			const collectionItemsByCollection = new Map<string, typeof collectionItemRows>();
			for (const row of collectionItemRows) {
				const rows = collectionItemsByCollection.get(row.collectionId) ?? [];
				rows.push(row);
				collectionItemsByCollection.set(row.collectionId, rows);
			}

			const publicPosts: PublicArtistPost[] = postRows.map((post) => {
				const visibility = sanitizeVisibility(post.visibility);
				const isLocked = !canViewVisibility(visibility, viewer);
				const document = documentsByPost.get(post.id);
				const poll = pollByPost.get(post.id);
				const pollOptions = optionsByPost.get(post.id) ?? [];
				const selectedOptionIds = poll ? (viewerVotesByPoll.get(poll.id) ?? new Set<string>()) : new Set<string>();
				const totalVotes = pollOptions.reduce(
					(total, row) => total + (votesByOption.get(row.option.id) ?? 0),
					0
				);

				return {
					id: post.id,
					type: 'post',
					title: post.title,
					slug: post.slug,
					excerpt: post.excerpt,
					bodyHtml: isLocked ? null : (document?.bodyHtml ?? null),
					visibility,
					publishedAt: post.publishedAt,
					isLocked,
					lockReason: isLocked ? lockReasonFor(visibility) : null,
					media: isLocked
						? []
						: (mediaByPost.get(post.id) ?? []).map((row) => ({
								id: row.media.id,
								type: row.media.type,
								fileUrl: normalizeSourceUrl(row.media.fileUrl) ?? row.media.fileUrl,
								thumbnailUrl: normalizeSourceUrl(row.media.thumbnailUrl),
								alt: row.media.alt,
								caption: row.media.caption
							})),
					musicAttachments: isLocked
						? []
						: (musicByPost.get(post.id) ?? [])
								.map((row) => {
									if (row.attachment.trackId && row.trackTitle) {
										return {
											id: row.attachment.trackId,
											type: 'track' as const,
											title: row.trackTitle,
											imageUrl: normalizeSourceUrl(row.trackImageUrl)
										};
									}
									if (row.attachment.albumId && row.albumTitle) {
										return {
											id: row.attachment.albumId,
											type: 'album' as const,
											title: row.albumTitle,
											imageUrl: normalizeSourceUrl(row.albumCoverImageUrl)
										};
									}
									return null;
								})
								.filter((item): item is PublicArtistPost['musicAttachments'][number] => Boolean(item)),
					poll:
						!isLocked && poll
							? {
									id: poll.id,
									question: poll.question,
									mode: poll.mode,
									showResults: poll.showResults,
									closesAt: poll.closesAt,
									totalVotes,
									hasVoted: selectedOptionIds.size > 0,
									options: pollOptions.map((row) => ({
										id: row.option.id,
										label: row.option.label,
										votes: votesByOption.get(row.option.id) ?? 0,
										selected: selectedOptionIds.has(row.option.id)
									}))
								}
							: null
				};
			});

			const publicPhotoAlbums: PublicPhotoAlbum[] = albumRows.map((album) => {
				const visibility = sanitizeVisibility(album.visibility);
				const isLocked = !canViewVisibility(visibility, viewer);

				return {
					id: album.id,
					type: 'photo_album',
					title: album.title,
					slug: album.slug,
					description: album.description,
					visibility,
					publishedAt: album.publishedAt,
					isLocked,
					lockReason: isLocked ? lockReasonFor(visibility) : null,
					photos: isLocked
						? []
						: (photosByAlbum.get(album.id) ?? []).map((row) => ({
								id: row.photo.id,
								fileUrl: normalizeSourceUrl(row.media.fileUrl) ?? row.media.fileUrl,
								thumbnailUrl: normalizeSourceUrl(row.media.thumbnailUrl),
								alt: row.photo.alt ?? row.media.alt,
								caption: row.photo.caption ?? row.media.caption
							}))
				};
			});

			const publicVideos: PublicArtistVideo[] = videoRows.map((video) =>
				this.toPublicVideo(video, viewer)
			);
			const publicVideoById = new Map(publicVideos.map((video) => [video.id, video]));

			const publicCollections: PublicVideoCollection[] = collectionRows.map((collection) => {
				const visibility = sanitizeVisibility(collection.visibility);
				const isLocked = !canViewVisibility(visibility, viewer);
				const collectionVideos = (collectionItemsByCollection.get(collection.id) ?? [])
					.map((item) => publicVideoById.get(item.videoId))
					.filter((video): video is PublicArtistVideo => Boolean(video));

				return {
					id: collection.id,
					type: 'video_collection',
					title: collection.title,
					slug: collection.slug,
					description: collection.description,
					visibility,
					publishedAt: collection.publishedAt,
					isLocked,
					lockReason: isLocked ? lockReasonFor(visibility) : null,
					videos: isLocked ? [] : collectionVideos
				};
			});

			const feed: PublicArtistFeedItem[] = [
				...publicPosts.map((item) => ({ ...item, feedType: 'post' as const })),
				...publicPhotoAlbums.map((item) => ({ ...item, feedType: 'photo_album' as const })),
				...publicVideos.map((item) => ({ ...item, feedType: 'video' as const })),
				...publicCollections.map((item) => ({ ...item, feedType: 'video_collection' as const }))
			].sort((a, b) => {
				const aTime = a.publishedAt?.getTime() ?? 0;
				const bTime = b.publishedAt?.getTime() ?? 0;
				return bTime - aTime;
			});

			return {
				feed,
				posts: publicPosts,
				photoAlbums: publicPhotoAlbums,
				videos: publicVideos,
				videoCollections: publicCollections
			};
		});
	}

	private static toPublicVideo(video: Video, viewer: ArtistContentViewer): PublicArtistVideo {
		const visibility = sanitizeVisibility(video.visibility);
		const isLocked = !canViewVisibility(visibility, viewer);

		return {
			id: video.id,
			type: 'video',
			title: video.title,
			slug: video.slug,
			description: video.description,
			thumbnailUrl: isLocked ? null : normalizeSourceUrl(video.thumbnailUrl),
			duration: isLocked ? null : video.duration,
			visibility,
			publishedAt: video.publishedAt,
			isLocked,
			lockReason: isLocked ? lockReasonFor(visibility) : null
		};
	}
}

export class PostPollService {
	static async vote(input: { pollId: string; optionId: string; userId: string }) {
		return await withDbLogging('PostPollService.vote', async () => {
			const [pollOption] = await db
				.select({
					pollId: postPolls.id,
					mode: postPolls.mode,
					closesAt: postPolls.closesAt,
					optionId: postPollOptions.id
				})
				.from(postPollOptions)
				.innerJoin(postPolls, eq(postPollOptions.pollId, postPolls.id))
				.where(and(eq(postPolls.id, input.pollId), eq(postPollOptions.id, input.optionId)))
				.limit(1);

			if (!pollOption) {
				return { ok: false as const, reason: 'Invalid poll option' };
			}

			if (pollOption.closesAt && pollOption.closesAt.getTime() <= Date.now()) {
				return { ok: false as const, reason: 'Poll is closed' };
			}

			if (pollOption.mode === 'single') {
				await db
					.delete(postPollVotes)
					.where(and(eq(postPollVotes.pollId, input.pollId), eq(postPollVotes.userId, input.userId)));
			} else {
				const [existingVote] = await db
					.select({ id: postPollVotes.id })
					.from(postPollVotes)
					.where(
						and(
							eq(postPollVotes.pollId, input.pollId),
							eq(postPollVotes.optionId, input.optionId),
							eq(postPollVotes.userId, input.userId)
						)
					)
					.limit(1);

				if (existingVote) {
					await db.delete(postPollVotes).where(eq(postPollVotes.id, existingVote.id));
					return { ok: true as const };
				}
			}

			await db
				.insert(postPollVotes)
				.values({
					pollId: input.pollId,
					optionId: input.optionId,
					userId: input.userId
				})
				.onConflictDoNothing();

			return { ok: true as const };
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
					PostService.getPostsForStudio(artistId),
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
