import {
	pgSchema,
	text,
	varchar,
	timestamp,
	boolean,
	integer,
	jsonb,
	uuid,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { artists } from './artist';

export const catalogDbSchema = pgSchema('catalog');

export const genres = catalogDbSchema.table('genres', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 50 }).notNull().unique(),
	displayName: varchar('display_name', { length: 50 }).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const albums = catalogDbSchema.table('albums', {
	id: uuid('id').primaryKey().defaultRandom(),
	artistId: uuid('artist_id')
		.notNull()
		.references(() => artists.id),
	title: varchar('title', { length: 200 }).notNull(),
	description: text('description'),
	coverImageUrl: text('cover_image_url'),
	releaseDate: timestamp('release_date'),
	price: integer('price'),
	isPublished: boolean('is_published').default(false),
	visibility: varchar('visibility', { length: 16 }).default('public').notNull(),
	genres: jsonb('genres').$type<string[]>(),
	metadata: jsonb('metadata'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const tracks = catalogDbSchema.table(
	'tracks',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		albumId: uuid('album_id').references(() => albums.id),
		artistId: uuid('artist_id')
			.notNull()
			.references(() => artists.id),
		title: varchar('title', { length: 200 }).notNull(),
		duration: integer('duration'),
		audioUrl: text('audio_url'),
		lyrics: text('lyrics'),
		clipUrl: text('clip_url'),
		imageUrl: text('image_url'),
		trackNumber: integer('track_number'),
		genre: jsonb('genres').$type<string[]>(),
		status: varchar('status', { length: 32 }).default('draft').notNull(),
		// 'r2' = we host the audio. 'audius' = audioUrl is the stable /stream endpoint.
		audioSource: varchar('audio_source', { length: 16 }).default('r2').notNull(),
		externalId: varchar('external_id', { length: 64 }),
		isPublished: boolean('is_published').default(false),
		visibility: varchar('visibility', { length: 16 }).default('public').notNull(),
		contentId: uuid('content_id'),
		metadata: jsonb('metadata'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [
		index('tracks_artist_status_idx').on(table.artistId, table.status),
		index('tracks_published_status_idx').on(table.isPublished, table.status),
		// `sql` template, not `ne()` — same migration-serialisation reason as the
		// artists index.
		uniqueIndex('tracks_source_external_unique')
			.on(table.audioSource, table.externalId)
			.where(sql`${table.audioSource} <> 'r2'`)
	]
);

export const albumTracks = catalogDbSchema.table('album_tracks', {
	id: uuid('id').primaryKey().defaultRandom(),
	albumId: uuid('album_id')
		.notNull()
		.references(() => albums.id, { onDelete: 'cascade' }),
	trackId: uuid('track_id')
		.notNull()
		.references(() => tracks.id, { onDelete: 'cascade' }),
	trackNumber: integer('track_number').notNull(),
	addedAt: timestamp('added_at').defaultNow().notNull()
});
