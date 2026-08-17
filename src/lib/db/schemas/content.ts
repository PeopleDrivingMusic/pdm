import {
	pgSchema,
	text,
	varchar,
	timestamp,
	boolean,
	integer,
	jsonb,
	uuid,
	foreignKey,
	unique,
	index
} from 'drizzle-orm/pg-core';
import { artists } from './artist';
import { users } from './users';
import { albums, tracks } from './catalog';

export const contentDbSchema = pgSchema('content');

export const posts = contentDbSchema.table(
	'posts',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		artistId: uuid('artist_id').notNull(),
		title: varchar({ length: 200 }).notNull(),
		slug: varchar({ length: 220 }).notNull(),
		bodyJson: jsonb('body_json').$type<Record<string, unknown> | null>(),
		bodyHtml: text('body_html'),
		excerpt: text(),
		coverMediaId: uuid('cover_media_id'),
		visibility: varchar({ length: 24 }).default('public').notNull(),
		status: varchar({ length: 24 }).default('draft').notNull(),
		publishedAt: timestamp('published_at'),
		scheduledAt: timestamp('scheduled_at'),
		commentsEnabled: boolean('comments_enabled').default(true).notNull(),
		reactionsEnabled: boolean('reactions_enabled').default(true).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: 'posts_artist_id_artists_id_fk'
		}),
		unique('posts_artist_id_slug_unique').on(table.artistId, table.slug),
		index('posts_artist_id_status_idx').on(table.artistId, table.status),
		index('posts_artist_id_published_at_idx').on(table.artistId, table.publishedAt)
	]
);

export const contentMedia = contentDbSchema.table(
	'content_media',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		artistId: uuid('artist_id').notNull(),
		type: varchar({ length: 24 }).notNull(),
		fileUrl: text('file_url').notNull(),
		thumbnailUrl: text('thumbnail_url'),
		alt: varchar({ length: 240 }),
		caption: text(),
		duration: integer(),
		width: integer(),
		height: integer(),
		metadata: jsonb('metadata'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: 'content_media_artist_id_artists_id_fk'
		}),
		index('content_media_artist_id_type_idx').on(table.artistId, table.type),
		index('content_media_metadata_gin_idx').using('gin', table.metadata)
	]
);

export const postMedia = contentDbSchema.table(
	'post_media',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		postId: uuid('post_id').notNull(),
		mediaId: uuid('media_id').notNull(),
		sortOrder: integer('sort_order').default(0).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: 'post_media_post_id_posts_id_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.mediaId],
			foreignColumns: [contentMedia.id],
			name: 'post_media_media_id_content_media_id_fk'
		}).onDelete('cascade'),
		unique('post_media_post_id_media_id_unique').on(table.postId, table.mediaId)
	]
);

export const postMusicAttachments = contentDbSchema.table(
	'post_music_attachments',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		postId: uuid('post_id').notNull(),
		trackId: uuid('track_id'),
		albumId: uuid('album_id'),
		sortOrder: integer('sort_order').default(0).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: 'post_music_attachments_post_id_posts_id_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.trackId],
			foreignColumns: [tracks.id],
			name: 'post_music_attachments_track_id_tracks_id_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.albumId],
			foreignColumns: [albums.id],
			name: 'post_music_attachments_album_id_albums_id_fk'
		}).onDelete('cascade')
	]
);

export const postPolls = contentDbSchema.table(
	'post_polls',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		postId: uuid('post_id').notNull(),
		question: varchar({ length: 280 }),
		mode: varchar({ length: 16 }).default('single').notNull(),
		closesAt: timestamp('closes_at'),
		showResults: varchar('show_results', { length: 24 }).default('after_vote').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: 'post_polls_post_id_posts_id_fk'
		}).onDelete('cascade')
	]
);

export const postPollOptions = contentDbSchema.table(
	'post_poll_options',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		pollId: uuid('poll_id').notNull(),
		label: varchar({ length: 160 }).notNull(),
		sortOrder: integer('sort_order').default(0).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.pollId],
			foreignColumns: [postPolls.id],
			name: 'post_poll_options_poll_id_post_polls_id_fk'
		}).onDelete('cascade')
	]
);

export const postPollVotes = contentDbSchema.table(
	'post_poll_votes',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		pollId: uuid('poll_id').notNull(),
		optionId: uuid('option_id').notNull(),
		userId: uuid('user_id').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.pollId],
			foreignColumns: [postPolls.id],
			name: 'post_poll_votes_poll_id_post_polls_id_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.optionId],
			foreignColumns: [postPollOptions.id],
			name: 'post_poll_votes_option_id_post_poll_options_id_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'post_poll_votes_user_id_users_id_fk'
		}).onDelete('cascade'),
		unique('post_poll_votes_poll_id_user_id_option_id_unique').on(
			table.pollId,
			table.userId,
			table.optionId
		)
	]
);

export const photoAlbums = contentDbSchema.table(
	'photo_albums',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		artistId: uuid('artist_id').notNull(),
		title: varchar({ length: 200 }).notNull(),
		slug: varchar({ length: 220 }).notNull(),
		description: text(),
		coverPhotoId: uuid('cover_photo_id'),
		visibility: varchar({ length: 24 }).default('public').notNull(),
		status: varchar({ length: 24 }).default('draft').notNull(),
		publishedAt: timestamp('published_at'),
		scheduledAt: timestamp('scheduled_at'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: 'photo_albums_artist_id_artists_id_fk'
		}),
		unique('photo_albums_artist_id_slug_unique').on(table.artistId, table.slug)
	]
);

export const photos = contentDbSchema.table(
	'photos',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		albumId: uuid('album_id').notNull(),
		mediaId: uuid('media_id').notNull(),
		alt: varchar({ length: 240 }),
		caption: text(),
		sortOrder: integer('sort_order').default(0).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.albumId],
			foreignColumns: [photoAlbums.id],
			name: 'photos_album_id_photo_albums_id_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.mediaId],
			foreignColumns: [contentMedia.id],
			name: 'photos_media_id_content_media_id_fk'
		}).onDelete('cascade')
	]
);

export const videos = contentDbSchema.table(
	'videos',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		artistId: uuid('artist_id').notNull(),
		title: varchar({ length: 200 }).notNull(),
		slug: varchar({ length: 220 }).notNull(),
		description: text(),
		videoMediaId: uuid('video_media_id'),
		thumbnailUrl: text('thumbnail_url'),
		duration: integer(),
		processingStatus: varchar('processing_status', { length: 24 }).default('ready').notNull(),
		visibility: varchar({ length: 24 }).default('public').notNull(),
		status: varchar({ length: 24 }).default('draft').notNull(),
		publishedAt: timestamp('published_at'),
		scheduledAt: timestamp('scheduled_at'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: 'videos_artist_id_artists_id_fk'
		}),
		unique('videos_artist_id_slug_unique').on(table.artistId, table.slug)
	]
);

export const videoCollections = contentDbSchema.table(
	'video_collections',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		artistId: uuid('artist_id').notNull(),
		title: varchar({ length: 200 }).notNull(),
		slug: varchar({ length: 220 }).notNull(),
		description: text(),
		coverVideoId: uuid('cover_video_id'),
		visibility: varchar({ length: 24 }).default('public').notNull(),
		status: varchar({ length: 24 }).default('draft').notNull(),
		publishedAt: timestamp('published_at'),
		scheduledAt: timestamp('scheduled_at'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: 'video_collections_artist_id_artists_id_fk'
		}),
		unique('video_collections_artist_id_slug_unique').on(table.artistId, table.slug),
		index('video_collections_artist_id_status_idx').on(table.artistId, table.status)
	]
);

export const videoCollectionItems = contentDbSchema.table(
	'video_collection_items',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		collectionId: uuid('collection_id').notNull(),
		videoId: uuid('video_id').notNull(),
		sortOrder: integer('sort_order').default(0).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.collectionId],
			foreignColumns: [videoCollections.id],
			name: 'video_collection_items_collection_id_video_collections_id_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.videoId],
			foreignColumns: [videos.id],
			name: 'video_collection_items_video_id_videos_id_fk'
		}).onDelete('cascade'),
		unique('video_collection_items_collection_id_video_id_unique').on(
			table.collectionId,
			table.videoId
		)
	]
);

export const artistFeedItems = contentDbSchema.table(
	'artist_feed_items',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		artistId: uuid('artist_id').notNull(),
		sourceType: varchar('source_type', { length: 32 }).notNull(),
		sourceId: uuid('source_id').notNull(),
		title: varchar({ length: 200 }).notNull(),
		previewText: text('preview_text'),
		coverUrl: text('cover_url'),
		visibility: varchar({ length: 24 }).default('public').notNull(),
		status: varchar({ length: 24 }).default('draft').notNull(),
		publishedAt: timestamp('published_at'),
		scheduledAt: timestamp('scheduled_at'),
		pinned: boolean().default(false).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: 'artist_feed_items_artist_id_artists_id_fk'
		}),
		unique('artist_feed_items_source_unique').on(table.sourceType, table.sourceId),
		index('artist_feed_items_artist_id_status_idx').on(table.artistId, table.status),
		index('artist_feed_items_artist_id_published_at_idx').on(table.artistId, table.publishedAt)
	]
);
