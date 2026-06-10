import {
	pgSchema,
	text,
	varchar,
	timestamp,
	jsonb,
	uuid,
	foreignKey,
	unique
} from 'drizzle-orm/pg-core';
import { artists } from './artist';

export const contentDbSchema = pgSchema('content');

export const artistVideos = contentDbSchema.table(
	'artist_videos',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		artistId: uuid('artist_id').notNull(),
		fileUrl: text('file_url').notNull(),
		tags: jsonb('tags'),
		date: timestamp('date', { mode: 'string' }),
		location: varchar({ length: 100 }),
		description: text(),
		stats: jsonb('stats'),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: 'artist_videos_artist_id_artists_id_fk'
		})
	]
);

export const artistPhotos = contentDbSchema.table(
	'artist_photos',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		artistId: uuid('artist_id').notNull(),
		fileUrl: text('file_url').notNull(),
		tags: jsonb('tags'),
		date: timestamp('date', { mode: 'string' }),
		description: text(),
		stats: jsonb('stats'),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: 'artist_photos_artist_id_artists_id_fk'
		})
	]
);

export const artistPosts = contentDbSchema.table(
	'artist_posts',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		artistId: uuid('artist_id').notNull(),
		content: text().notNull(),
		images: jsonb('images'),
		widgets: jsonb('widgets'),
		tags: jsonb('tags'),
		date: timestamp('date', { mode: 'string' }),
		stats: jsonb('stats'),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: 'artist_posts_artist_id_artists_id_fk'
		})
	]
);

export const artistTags = contentDbSchema.table(
	'artist_tags',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		artistId: uuid('artist_id').notNull(),
		tag: varchar({ length: 50 }).notNull(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull()
	},
	(table) => [
		foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: 'artist_tags_artist_id_artists_id_fk'
		}),
		unique('artist_tags_artist_id_tag_unique').on(table.artistId, table.tag)
	]
);
